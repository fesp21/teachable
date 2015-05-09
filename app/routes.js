
var User            = require('../app/models/user');
var Course          = require('../app/models/course');
var Mailer          = require('../app/mailer');

module.exports = function(app, passport) {

    // =====================================
    // HOME PAGE ===========================
    // =====================================
    app.get('/', function(req, res, next) {
        res.render('index');
    });

    // =====================================
    // LOGIN ===============================
    // =====================================
    // show the login form
    app.get('/login', function(req, res, next) {
        var msg = req.flash('loginMessage');
        res.render('login', { message: msg, hasMessage: msg.length > 0 });
    });

    
    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/profile', // redirect to the secure profile section
        failureRedirect : '/login', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));


    // =====================================
    // SIGNUP ==============================
    // =====================================
    // show the signup form
    app.get('/signup', function(req, res) {
        var msg = req.flash('signupMessage');
        res.render('signup', { message: msg, hasMessage: msg.length > 0 });
    });

    // process the signup form
    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/profile',
        failureRedirect : '/signup',
        failureFlash : true
    }));


    // =====================================
    // PROFILE SECTION =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    app.get('/profile', isLoggedIn, function(req, res) {
        res.render('profile', {
            user : req.user
        });
    });


    // =====================================
    // USERS SECTION =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    app.get('/users', isLoggedIn, function(req, res) {
        User.find(function(err, users) {
            res.render('users', {
                user : req.user,
                users: users,
                error: err
            });
        });
    });

    app.post('/users', isLoggedIn, function(req, res) {
        console.log("Creating new User");

        var newUser = new User();
        if (req.user.admin) {
            newUser.admin              = req.body.admin;
        }
        newUser.local.name             = req.body.name;
        newUser.local.email            = req.body.email;
        var password                   = req.body.password || Math.random().toString(36).slice(-8);
        newUser.local.password         = newUser.generateHash(password);
        
        newUser.save();

        if (req.body.notify) {
            console.log("notifying the user '" + newUser.local.name + "' ('" + newUser.local.email + "')");

            Mailer.send(newUser.local.email, 'Neues Konto auf Teachable', "Ihr neuer Nutzer ist: '" + newUser.local.name + "' und Ihr PassworT: '" + password + "'. Damit können Sie sich direkt auf <a href=\"shdev.de:3333\">Teachable</a> anmelden.", function() {
                res.redirect('/users');
            });
        } else {
            res.redirect('/users');
        }

    });
    
    app.put('/users/:id', isAdminLoggedIn, function(req, res) {
        console.log(req.body);
        var user = {
            $set: {
                admin: req.body.admin,
                "local.email": req.body.email,
                "local.name": req.body.name
            }
        };
        User.findByIdAndUpdate(req.params.id, user, function(err, user) {
            if (err) {
                console.error(err);
                res.status(500, err).end();
            } else {
                res.status(200).end();
            }
        });
    });

    app.delete('/users/:id', isAdminLoggedIn, function(req, res) {
        console.log("Delete User '", req.params.id, "'");
        User.findByIdAndRemove(req.params.id, function(err, user) {
            if (err) {
                console.error(err);
                res.status(500, err).end();
            } else {
                console.error("deleted.");
                res.status(200).end();
            }
        });

    });

    // =====================================
    // COURSE SECTION =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    app.get('/courses', isLoggedIn, function(req, res) {
        Course.find(function(err, courses) {
            if (err) {
                res.render('courses', {
                    user : req.user,
                    courses: courses,
                    users: [],
                    error: err
                });
            } else {
                User.find(function(err, users) {
                    res.render('courses', {
                        user : req.user,
                        courses: courses,
                        users: users,
                        error: err
                    });
                });
            }
        });
    });

    app.post('/courses', isAdminLoggedIn, function(req, res) {
        console.log("Creating new Course");
        console.dir(req.body);
        var teachers = req.body.teachers;

        var newCourse = new Course({
            name             : req.body.name,
            state            : req.body.state,
            dates            : req.body.dates,
            doodle           : req.body.doodle,
            participants     : req.body.participants,
            teachers         : teachers ? req.body.teachers.split(',') : []
        });
        newCourse.save();

        res.redirect('/courses');
    });

    app.delete('/courses/:id', isAdminLoggedIn, function(req, res) {
        console.log("Delete Course '", req.params.id, "'");
        Course.findByIdAndRemove(req.params.id, function(err, user) {
            if (err) {
                console.error(err);
                res.status(500, err).end();
            } else {
                console.error("deleted.");
                res.status(200).end();
            }
        });
    });


    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });
};


function isLoggedIn(req, res, next) {

    if (req.isAuthenticated()){
        return next();
    }

    res.redirect('/');
}

function isAdminLoggedIn(req, res, next) {

    if (req.isAuthenticated() && req.user.admin){
        return next();
    }

    res.redirect('/');
}
