import React from 'react';
import Emoji from './Emoji';
import Popover from 'react-bootstrap/Popover';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import { HeartFill, QuestionCircleFill, BugFill, Github } from 'react-bootstrap-icons';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function Footer() {

	const info_popover = (
	  <Popover className = "footer-popover">
	    <Popover.Title className = "footer-popover-title">如何游玩</Popover.Title>
	    <Popover.Content className = "footer-popover-content">
	    	<p className = "mb-2">
	    		五子连成一线即可获胜！
	    		<Emoji symbol=" 🎉 "/>
	    		如果还有疑问，请查看
	      		<a className = "footer-link" href = "https://baike.baidu.com/item/%E4%BA%94%E5%AD%90%E6%A3%8B" target = "_blank" rel="noopener noreferrer"> 详细规则。</a>
	    	</p>
	    </Popover.Content>
	  </Popover>
	);
	
	const about_popover = (
	  <Popover className = "footer-popover">
	    <Popover.Title className = "footer-popover-title">关于本游戏</Popover.Title>
	    <Popover.Content className = "footer-popover-content">
	    	<p className = "mb-2">
	    		嘿！<Emoji symbol="👋 "/>
	    		这是一个开源的五子棋小游戏。
	      		<a className = "footer-link" href = "https://github.com/scheng20/gomoku-online" target = "_blank" rel="noopener noreferrer"> 原作者 Github</a>
	    	</p>
	    </Popover.Content>
	  </Popover>
	);

	const bug_popover = (
	  <Popover className = "footer-popover">
	    <Popover.Title className = "footer-popover-title">报告 Bug</Popover.Title>
	    <Popover.Content className = "footer-popover-content">
	    	<p>
	    		发现游戏有 Bug？
	    	</p>
	    	<p>
	    		很抱歉给您带来不便。<Emoji symbol="🙇 "/>
	    		如果您想报告 Bug，请在 GitHub 上提交 Issue。
	    	</p>
	    </Popover.Content>
	  </Popover>
	);

	const github_popover = (
	  <Popover className = "footer-popover">
	    <Popover.Title className = "footer-popover-title">在 GitHub 上查看</Popover.Title>
	    <Popover.Content className = "footer-popover-content">
	    	<p className = "mb-2">
	    		想看看这个游戏背后的代码吗？
	    		<Emoji symbol=" 💻"/>
	      		<a className = "footer-link" href = "https://github.com/scheng20/gomoku-online" target = "_blank" rel="noopener noreferrer"> 点击这里查看！ </a>
	    	</p>
	    </Popover.Content>
	  </Popover>
	);

	return (
	    <div className = "footer">
	    	<OverlayTrigger trigger="focus" placement="top" overlay={info_popover}>
		    	<button className="footer-button">
		    		<QuestionCircleFill color="white" size={26}/>
		    	</button>
		  	</OverlayTrigger>
	    	<OverlayTrigger trigger="focus" placement="top" overlay={about_popover}>
		    	<button className="footer-button">
		    		<HeartFill color="white" size={26}/>
		    	</button>
		  	</OverlayTrigger>
		  	<OverlayTrigger trigger="focus" placement="top" overlay={bug_popover}>
		    	<button className="footer-button">
		    		<BugFill color="white" size={26}/>
		    	</button>
		  	</OverlayTrigger>
		  	<OverlayTrigger trigger="focus" placement="top" overlay={github_popover}>
		    	<button className="footer-button">
		    		<Github color="white" size={26}/>
		    	</button>
		  	</OverlayTrigger>
	    </div>
    );
}