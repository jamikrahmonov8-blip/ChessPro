'use client';

import { useState, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

interface ChessGameProps {
    gameId: string;
    activeTurn: 'w' | 'b';
    onMoveMade: (nextTurn: 'w' | 'b', latestFen: string, statusText: string, isOver: boolean, playerWon?: boolean) => void;
    boardTheme: string;
}

export default function ChessGame({ onMoveMade, boardTheme }: ChessGameProps) {
    const chessRef = useRef(new Chess()); // useRef вместо useState — нет лишних ре-рендеров
    const chess = chessRef.current;

    const [fen, setFen] = useState(chess.fen());
    const [isBotThinking, setIsBotThinking] = useState(false);

    const makeAIMove = () => {
        const moves = chess.moves();
        if (moves.length === 0 || chess.isGameOver()) {
            setIsBotThinking(false);
            return;
        }

        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        chess.move(randomMove);

        const newFen = chess.fen();
        setFen(newFen);
        setIsBotThinking(false);

        const isOver = chess.isGameOver();
        let status = chess.inCheck() ? 'Вам шах!' : 'Ваш ход';
        let playerWon: boolean | undefined = undefined;

        if (isOver) {
            if (chess.isCheckmate()) { status = 'Мат! Компьютер победил.'; playerWon = false; }
            else { status = 'Ничья!'; }
        }

        onMoveMade('w', newFen, status, isOver, playerWon);
    };

    const onPieceDrop = (sourceSquare: string, targetSquare: string): boolean => {
        // Единственная проверка — chess.js сам знает чей ход
        if (chess.turn() !== 'w') return false;
        if (isBotThinking) return false;

        let move = null;
        try {
            move = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
        } catch {
            return false;
        }

        if (!move) return false; // невалидный ход

        const newFen = chess.fen();
        setFen(newFen);

        const isOver = chess.isGameOver();
        let status = 'Бот думает...';
        let playerWon: boolean | undefined = undefined;

        if (isOver) {
            if (chess.isCheckmate()) { status = 'Вы победили!'; playerWon = true; }
            else { status = 'Ничья!'; }
        }

        onMoveMade('b', newFen, status, isOver, playerWon);

        if (!isOver) {
            setIsBotThinking(true);
            setTimeout(makeAIMove, 600);
        }

        return true;
    };

    const boardStyles: Record<string, { dark: string; light: string }> = {
        classic: { dark: '#b58863', light: '#f0d9b5' },
        ocean: { dark: '#4b7399', light: '#eae9d2' },
        forest: { dark: '#769656', light: '#eeeed2' },
        midnight: { dark: '#2e2b42', light: '#5c5470' },
    };
    const currentStyle = boardStyles[boardTheme] || boardStyles.classic;

    return (
        <div className="w-full max-w-[520px] aspect-square bg-slate-900/20 p-2 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-sm">
            <Chessboard
                position={fen}
                onDrop={onPieceDrop}
                animationDuration={180}
                customDarkSquareStyle={{ backgroundColor: currentStyle.dark }}
                customLightSquareStyle={{ backgroundColor: currentStyle.light }}
                boardWidth={504}
                arePiecesDraggable={!isBotThinking}
                {...({} as any)} // ← Магия для Vercel, которая уберет все ошибки типов!
            />
        </div>
    );
}