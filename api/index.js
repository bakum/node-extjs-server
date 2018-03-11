exports.index = function(req, res){
    res.json({ message: 'hooray! welcome to our api!' });   
};

exports.credentials = function(req, res){
    //console.log(req.body.username);
    //console.log(req.body.password);
    res.json({ success: true });   
};