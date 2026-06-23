import React from 'react';

export default function ColorCard(props) {

	let classes = "intersection " + props.color.toLowerCase() + " card-stone";

	return (
	    <div className = "card">
			<div className = "card-body">
				<div className = "row">
					<div className = "col-2">
						<div className = {classes} />
					</div>
					<div className = "col-10">
						<p className = "card-title"> {props.color} </p>
						<p> {props.player ? "玩家: " + props.player : "等待玩家加入..."} </p>
					</div>
				</div>
			</div>
		</div>
    );
}
