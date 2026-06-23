// Color Legend:
// black = 1
// white = 2

const users = [];

const addUser = ({id, name, room}) => {

	name = name.trim();
	let color = 0;
	
	const existingUser = users.find((user) => user.room === room && user.name === name);

	if(getUsersInRoom(room).length === 2) {
		return {error: '房间已满！请加入其他房间或创建新房间。'};
	}
	
	if(existingUser) {
		return {error: '昵称已被使用！请选择其他昵称。'};
	}
	
	if(getUsersInRoom(room).length === 0) {
		color = 1;
	} else {
		
		let otherPlayerColor = getUsersInRoom(room)[0].color;

		if(otherPlayerColor === 1) {
			color = 2;
		} else {
			color = 1;
		}
		
	}

	const user = {id, name, room, color};

	users.push(user);

	return { user };

}

const removeUser = (id) => {
	const index = users.findIndex((user) => user.id === id);

	if(index !== -1) {
		return users.splice(index, 1)[0];
	}
}

const getUser = (id) => {
	return users.find((user) => user.id === id);
}

const getUsersInRoom = (room) => {
	return users.filter((user) => user.room === room);
}

module.exports = {addUser, removeUser, getUser, getUsersInRoom};