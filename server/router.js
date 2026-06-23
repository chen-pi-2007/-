const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
	res.send('服务器运行正常 ✅');
});

module.exports = router;