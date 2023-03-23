const HTTP_PORT = process.env.PORT || 8080;
const favicon = require('serve-favicon');
const express = require("express");
const app = express();

const tcfData = require("./modules/tcfData");
const path = require("path");
const exphbs = require("express-handlebars");

app.engine(".hbs", exphbs.engine({
    extname: ".hbs",
    helpers: {
        navLink: function(url, options){
            return '<li' + 
            ((url == app.locals.activeRoute) ? ' class="nav-item active" ' : ' class="nav-item" ') + 
            '><a class="nav-link" href="' + url + '">' + options.fn(this) + '</a></li>';
        },
        equal: function (lvalue, rvalue, options) {
            if (arguments.length < 3)
            throw new Error("Handlebars Helper equal needs 2 parameters");
            if (lvalue != rvalue) {
            return options.inverse(this);
            } else {
            return options.fn(this);
            }
        },
        select: function(value, options) {
            return options.fn(this)
              .split('\n')
              .map(function(v) {
                var t = 'value="' + value + '"'
                return ! RegExp(t).test(v) ? v : v.replace(t, t + ' selected="selected"')
              })
              .join('\n')
        }
    }
}));

app.set("view engine", ".hbs");

app.use(express.static("public"));
app.use(express.urlencoded({extended:true}));
app.use(favicon(__dirname + '/favicon.ico'));

app.use(function(req,res,next){
    let route = req.path.substring(1);
    app.locals.activeRoute = "/" + (isNaN(route.split('/')[1]) ? route.replace(/\/(?!.*)/, "") : route.replace(/\/(.*)/, "")); 
    next();
});

app.get("/", (req,res)=>{
    res.render("home");
});

tcfData.initialize().then(()=>{
    app.listen(HTTP_PORT, ()=>{
        console.log("server listening on port: " + HTTP_PORT)
    });
}).catch(err=>{
    console.log(err);
});