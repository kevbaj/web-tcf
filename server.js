const HTTP_PORT = process.env.PORT || 8080;
const favicon = require('serve-favicon');
const express = require("express");
const session = require('express-session');
const MSSQLSessionStore = require('connect-mssql')(session);
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));

const tcfData = require("./modules/tcfData");
const path = require("path");

const exphbs = require("express-handlebars");
const { rejects } = require('assert');
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

const sessionStore = new MSSQLSessionStore({
    database: 'db_TCF',
    user: 'admin',
    password: 'sapassw0rd',
    server: 'dbtcf.cceiephcgn5r.us-east-1.rds.amazonaws.com',
    table: 'sessions'
});
  
app.use(session({
    secret: 'tcfgroup5',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
    store: sessionStore
}));

const authMiddleware = (req, res, next) => {
    if (req.session.isAuthenticated) {
      next();
    } else {
      res.redirect('/home');
    }
};

app.use(function(req,res,next){
    let route = req.path.substring(1);
    app.locals.activeRoute = "/" + (isNaN(route.split('/')[1]) ? route.replace(/\/(?!.*)/, "") : route.replace(/\/(.*)/, "")); 
    
    next();
});

//-----------GET FUNCTIONS---------------------------------------------------------------------------------------

app.get("/", (req,res)=>{
    const query = "SELECT TOP 1 * FROM Info.Location";
    let contac;
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(query)
        ])
    }).then(results => {
        contac = results[0].recordset
        res.render('home', { contac })
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "Contact Not Found"});
    })
});

app.get("/home", (req,res)=>{
    const query = "SELECT TOP 1 * FROM Info.Location";
    let contac;
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(query)
        ])
    }).then(results => {
        contac = results[0].recordset
        res.render('home', { contac })
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "Contact Not Found"});
    })
});

app.get("/about", (req,res)=>{
    const query = "SELECT TOP 1 * FROM Info.Location";
    let contac;
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(query)
        ])
    }).then(results => {
        contac = results[0].recordset
        res.render('about', { contac })
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "Contact Not Found"});
    })
});

app.get("/contact", (req,res)=>{
    const query1 = "Select *,DATENAME(dw,day_num) as 'DayName',case when Info.OfficeHour.status=0 then 'Closed' else cast(FORMAT(cast(open_hr as datetime), N'hh:mm tt') as nvarchar(20)) + ' - ' + cast(FORMAT(cast(close_hr as datetime), N'hh:mm tt') as nvarchar(20)) end as 'Hrs' from Info.OfficeHour order by day_num asc"
    const query2 = "SELECT TOP 1 * FROM Info.Location"
    let rows1, rows2, contac
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(query1),
            pool.request().query(query2)
        ])
    }).then(results => {
        rows1 = results[0].recordset
        rows2 = results[1].recordset
        contac= results[1].recordset
        res.render('contact', { rows1, rows2, contac })
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "Contact Not Found"});
    })
});

app.get("/createadmin", authMiddleware, (req,res)=>{
    const query="Select *, case when is_active=1 then 'Active' else 'Deactive' end as Stat from Admin.Accounts";
    let rows1;
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(query)
        ])
    }).then(results => {
        rows1 = results[0].recordset;
        res.render("createadmin", { layout: 'admin',rows1 });
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "Users Not Found"});
    })
    
});

app.get("/dashboard", authMiddleware,(req,res)=>{
    res.render('dashboard', { layout: 'admin' });
});

app.get("/contactinfo", authMiddleware,(req,res)=>{
    const query = "SELECT TOP 1 * FROM Info.Location"
    let contac
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(query)
        ])
    }).then(results => {
        contac= results[0].recordset
        res.render('contactinfo', { layout: 'admin', contac })
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "Contact Not Found"});
    })
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/home');
  });
//-------------POST TRANSACTION-------------------------------------
app.post('/contact', (req, res) => {
    tcfData.SUBMIT_INQUIRY(req.body).then(()=>{
        res.redirect("/contact");
    }).catch(err=>{
        console.error(err)
        res.status(500).render("error404",{message: "Inquiry Not Saved"});
    });
});

app.post("/login", (req,res)=>{
    tcfData.searchLogin(req.body).then(loginData=>{
        if (loginData.length > 0) {
            req.session.isAuthenticated = true;
            req.session.user = loginData;
            res.redirect("dashboard");
        } else {
            res.render('home', { message: 'Invalid username or password' });
        }
    }).catch(err=>{
        console.error(err)
        res.status(500).render("error404",{message: "Unable to Login"});
    });
});

app.post("/saveadmin",(req,res)=>{
    tcfData.SAVE_ADMINACCOUNT(req.body).then(()=>{
        res.redirect("/createadmin");
    }).catch(err=>{
        console.error(err)
        res.status(500).render("error404",{message: "Admin Account Not Saved"});
    });
});

app.post("/updatecontact",(req,res)=>{
    tcfData.UPDATE_CONTACT(req.body).then(()=>{
        res.redirect("/contactinfo");
    }).catch(err=>{
        console.error(err)
        res.status(500).render("error404",{message: "Contact Info Not Saved"});
    });
});

//----------INITIALIZE-----------------------------------------
tcfData.initialize().then(()=>{
    app.listen(HTTP_PORT, ()=>{
        console.log("server listening on port: " + HTTP_PORT)
    });
}).catch(err=>{
    console.log(err);
});