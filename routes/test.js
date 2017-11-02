var express = require('express');
var router = express.Router();
router.get('/get_test',function(req,res,next){ 
    console.log('subrata');
});

module.exports = router;

