var express = require('express')
    , passport = require('passport')
    , morgan = require('morgan')
    , cookieParser = require('cookie-parser')
    , bodyParser = require('body-parser')
    , methodOverride = require('method-override')
    , session = require('express-session')
    , util = require('util')
    , InstagramStrategy = require('passport-instagram').Strategy
    , https = require('https')
    , q = require('q')
    , cookieSession = require('cookie-session');

var port = process.env.PORT || 3000;

if(typeof process.env.environment === 'undefined' ){
    var config = require('./config');
    var INSTAGRAM_CLIENT_ID = config['INSTAGRAM_CLIENT_ID'];
    var INSTAGRAM_CLIENT_SECRET = config['INSTAGRAM_CLIENT_SECRET'];
    var INSTAGRAM_CLIENT_CALLBACK = config['INSTAGRAM_CLIENT_CALLBACK'];
}else{
    var INSTAGRAM_CLIENT_ID = process.env['INSTAGRAM_CLIENT_ID'];
    var INSTAGRAM_CLIENT_SECRET = process.env['INSTAGRAM_CLIENT_SECRET'];    
    var INSTAGRAM_CLIENT_CALLBACK = process.env['INSTAGRAM_CLIENT_CALLBACK'].replace( '{{PORT}}', port );    
}



// Passport session setup.
//     To support persistent login sessions, Passport needs to be able to
//     serialize users into and deserialize users out of the session.    Typically,
//     this will be as simple as storing the user ID when serializing, and finding
//     the user by ID when deserializing.    However, since this example does not
//     have a database of user records, the complete Instagram profile is
//     serialized and deserialized.
passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});


// Use the InstagramStrategy within Passport.
//     Strategies in Passport require a `verify` function, which accept
//     credentials (in this case, an accessToken, refreshToken, and Instagram
//     profile), and invoke a callback with a user object.
passport.use(new InstagramStrategy({
        clientID: INSTAGRAM_CLIENT_ID,
        clientSecret: INSTAGRAM_CLIENT_SECRET,
        callbackURL: "http://tsvm:3000/auth/instagram/callback"
    },
    function(accessToken, refreshToken, profile, done) {
        // asynchronous verification, for effect...

        console.log("accessToken: ", accessToken);

        global.accessToken = accessToken;

        // getMedia( global.accessToken );

        process.nextTick(function () {
        
            // To keep the example simple, the user's Instagram profile is returned to
            // represent the logged-in user.    In a typical application, you would want
            // to associate the Instagram account with a user record in your database,
            // and return that user instead.
            return done(null, profile);
        });
    }
));

function getMedia(accessToken){

    console.log('getMedia called with accessToken: ', accessToken);

    var deferred = q.defer();

    // try {

        https.get('https://api.instagram.com/v1/users/self/media/recent?access_token=' + accessToken, function(res){
            var str = ''

            res.on('data', function (chunk) {
                str += chunk;
            });

            res.on('end', function () {
                var objRes = JSON.parse(str);
                // console.log( str );
                deferred.resolve( objRes.data );
                // global.data = objRes.data;
                // var totalLikes = 0;
                
                // for( i = 0; i < global.data.length; i++ ){
                //     thisLikes = global.data[i].likes.count;
                //     totalLikes += thisLikes;
                // }

                // averageLikes = Math.floor(totalLikes / global.data.length);

                // for( i = 0; i < global.data.length; i++ ){
                //     thisLikes = global.data[i].likes.count;
                //     console.log( 'Image: ' + i + ' Likes: ' + thisLikes + ' Performance: ' + (thisLikes - averageLikes) );
                // }
                
                // console.log( 'Total likes: ', totalLikes );
                // console.log( 'Average Likes: ', totalLikes / data.length );

            });
        });

    // }

    // catch(e){
    //     console.log(e);
    // }

    console.log('getMedia finished running.');

    return deferred.promise;
}



var app = express();
// configure Express

    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(morgan('combined'));
    app.use(cookieParser());
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(bodyParser.json());
    app.use(methodOverride());
    app.use(cookieSession({
        name: 'session',
        saveUninitialized: true,
        resave: true,
        secret: 'secret'
    }));    // Initialize Passport!    Also use passport.session() middleware, to support
    // persistent login sessions (recommended).
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(express.static(__dirname + '/public'));



app.get('/', function(req, res){
    // console.log('typeof global.accessToken: ', typeof global.accessToken);
    // if(typeof global.accessToken !== 'undefined'){
    //     getMedia(global.accessToken).then( function(value){
    //         var recentMedia = value;
    //         // console.log( JSON.stringify(recentMedia) );
    //         res.render('index', { user: req.user, data: recentMedia });
    //     });
    // }
    res.render('index', { user: req.user });
});

app.get('/account', ensureAuthenticated, function(req, res){
    console.log('typeof global.accessToken: ', typeof global.accessToken);
    if(typeof global.accessToken !== 'undefined'){
        getMedia(global.accessToken).then( function(value){
            var recentMedia = value;
            // console.log( JSON.stringify(recentMedia) );
            res.render('account', { user: req.user, data: recentMedia });
        });
    }
    // res.render('account', { user: req.user });
});

app.get('/login', function(req, res){
    res.render('login', { user: req.user });
});

// GET /auth/instagram
//     Use passport.authenticate() as route middleware to authenticate the
//     request.    The first step in Instagram authentication will involve
//     redirecting the user to instagram.com.    After authorization, Instagram
//     will redirect the user back to this application at /auth/instagram/callback
app.get('/auth/instagram',
    passport.authenticate('instagram'),
    function(req, res){
        // The request will be redirected to Instagram for authentication, so this
        // function will not be called.
    });

// GET /auth/instagram/callback
//     Use passport.authenticate() as route middleware to authenticate the
//     request.    If authentication fails, the user will be redirected back to the
//     login page.    Otherwise, the primary route function function will be called,
//     which, in this example, will redirect the user to the home page.
app.get('/auth/instagram/callback', 
    passport.authenticate('instagram', { failureRedirect: '/login' }),
    function(req, res) {

        res.redirect('/account');
    });

app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

app.listen(port, function(error) {
    if (error) {
        console.error(error)
    } else {
        console.info("==> 🌎    Listening on port %s. Open up http://localhost:%s/ in your browser.", port, port)
    }
})

// Simple route middleware to ensure user is authenticated.
//     Use this route middleware on any resource that needs to be protected.    If
//     the request is authenticated (typically via a persistent login session),
//     the request will proceed.    Otherwise, the user will be redirected to the
//     login page.
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/login')
}