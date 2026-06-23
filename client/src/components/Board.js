import React from 'react';
import BoardIntersection from './BoardIntersection';

export default function Board(props) {

	const gs = props.grid_size;
	const style = {
		width: props.size * gs,
		height: props.size * gs,
		'--grid-size': gs + 'px'
	};

	let intersections = [];

	for(let i = 0; i < props.size; i++) {
		for (let j = 0; j < props.size; j++) {
			intersections.push(BoardIntersection({
				board: props.board,
				row: i,
				col: j,
				color: props.board[i] ? props.board[i][j] : 0,
				play: props.on_play,
				grid_size: gs
			}));
		}
	}

	return (
		<div style = {style} id = "board">{intersections}</div>
	);
}