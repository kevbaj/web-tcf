const HTTP_PORT = process.env.PORT || 8080;
const favicon = require('serve-favicon');
const express = require("express");
const session = require('express-session');
const fetch = require('node-fetch');
const MSSQLSessionStore = require('connect-mssql')(session);
const moment = require('moment-timezone');
const torontoTime = moment().tz('America/Toronto');
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
        isLessThan: function(a, b, options){
            if (a < b) {
                return options.fn(this);
            } else {
                return options.inverse(this);
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

const loc_query="SELECT TOP 1 a.*, b.PROV_TEXT, c.CNT_Short,d.CT_NAME FROM Info.Location a join SysInfo.Provinces b on b.PROV_ID=a.loc_prov join SysInfo.Countries c on c.CNT_ID=a.loc_country join SysInfo.Cities d on d.CT_ID=a.loc_city";

//-----------GET FUNCTIONS---------------------------------------------------------------------------------------

app.get("/", (req,res)=>{
    let dtnow = torontoTime.format('MM-D-YYYY h:mm:ss');
    const ne_query = "Select *, case when ne_type=1 then 'NEWS' when ne_type=2 then 'EVENTS' end as type_txt,CONCAT(LEFT(ne_det, 60), '....') as det_short, DATEDIFF(minute,ne_dtpost,cast('" + dtnow + "' as datetime)) as dtdif, FORMAT(ne_dtpost, 'MMM dd yyyy hh:mm tt') as dtname from Info.NewsEvents";
    let contac, ne_res;
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(loc_query),
            pool.request().query(ne_query)
        ])
    }).then(results => {
        contac = results[0].recordset;
        ne_res = results[1].recordset;
        res.render('home', { contac,ne_res })
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "Contact Not Found"});
    })
});

app.get("/home", (req,res)=>{
    let dtnow = torontoTime.format('MM-D-YYYY h:mm:ss');
    const ne_query = "Select *, case when ne_type=1 then 'NEWS' when ne_type=2 then 'EVENTS' end as type_txt,CONCAT(LEFT(ne_det, 60), '....') as det_short, DATEDIFF(minute,ne_dtpost,cast('" + dtnow + "' as datetime)) as dtdif, FORMAT(ne_dtpost, 'MMM dd yyyy hh:mm tt') as dtname from Info.NewsEvents";
    let contac, ne_res;
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(loc_query),
            pool.request().query(ne_query)
        ])
    }).then(results => {
        contac = results[0].recordset;
        ne_res = results[1].recordset;
        res.render('home', { contac, ne_res })
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "Contact Not Found"});
    })
});

app.get("/about", (req,res)=>{
    const abt_query = "Select * from Info.About order by ABT_ORDER ASC";
    let contac, abt_res;
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(loc_query),
            pool.request().query(abt_query),
        ])
    }).then(results => {
        contac = results[0].recordset
        abt_res = results[1].recordset
        res.render('about', { contac,abt_res })
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "Contact Not Found"});
    })
});

app.get("/contact", (req,res)=>{
    const query1 = "Select *,DATENAME(dw,day_num) as 'DayName',case when Info.OfficeHour.status=0 then 'Closed' else cast(FORMAT(cast(open_hr as datetime), N'hh:mm tt') as nvarchar(20)) + ' - ' + cast(FORMAT(cast(close_hr as datetime), N'hh:mm tt') as nvarchar(20)) end as 'Hrs' from Info.OfficeHour order by day_num asc"
    let rows1, rows2, contac
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(query1),
            pool.request().query(loc_query)
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

app.get("/createaccount", authMiddleware, (req,res)=>{
    const query="Select a.*, case when a.is_active=1 then 'Active' else 'Deactive' end as Stat, case when a.is_admin=1 then 'Admin' else 'User' end as user_type, case when a.is_admin=1 then a.fname else b.d_fname end as u_fname, case when a.is_admin=1 then a.lname else b.d_lname end as u_lname from Admin.Accounts a left join Donation.Donors b on b.donor_id=a.donor_id";
    const donor_query="Select * from Donation.Donors where is_active=1";
    let rows1, donor_res;
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(query),
            pool.request().query(donor_query)
        ])
    }).then(results => {
        rows1 = results[0].recordset;
        donor_res= results[1].recordset;
        res.render("createaccount", { layout: 'admin',rows1,donor_res });
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "Users Not Found"});
    })
});

app.get("/dashboard", authMiddleware,(req,res)=>{
    res.render('dashboard', { layout: 'admin' });
});

app.get("/location", authMiddleware,(req,res)=>{
    const query = "SELECT TOP 1 * FROM Info.Location";
    const query2 = "Select a.*, case when b.loc_country is null then 'false' else 'true' end as is_selected from SysInfo.Countries a left join Info.Location b on a.CNT_ID=b.loc_country order by a.CNT_Long";
    let contac, cnt_res;

    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(query),
            pool.request().query(query2)
        ])
    }).then(results => {
        contac= results[0].recordset;
        cnt_res=results[1].recordset;
        res.render('location', { layout: 'admin', contac, cnt_res });
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "Location Not Found"});
    });
    
});

app.get('/provinces/:countryCode', (req, res) => {
    const countryCode = req.params.countryCode;
    const query = "Select a.*, case when b.loc_prov is null then 'false' else 'true' end is_selected from SysInfo.Provinces a left join Info.Location b on b.loc_prov=a.PROV_ID where a.CNT_ID="+ countryCode +" order by a.PROV_TEXT";
    let prov_res;
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(query)
        ])
    }).then(results => {
        prov_res= results[0].recordset;
        res.json(prov_res);
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "Province Not Found"});
    });
});
  
app.get('/cities/:province', (req, res) => {
    const provinceCode = req.params.province;
    const query = "Select a.*, case when b.loc_city is null then 'false' else 'true' end as is_selected from SysInfo.Cities a left join Info.Location b on b.loc_city=a.CT_ID where a.PROV_ID="+ provinceCode +" order by a.CT_NAME";
    let city_res;
    
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(query)
        ])
    }).then(results => {
        city_res= results[0].recordset;
        res.json(city_res);
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "City Not Found"});
    });
});

app.get("/officehr",authMiddleware,(req,res)=>{
    const query1 = "Select *,DATENAME(dw,day_num) as 'DayName',case when Info.OfficeHour.status=0 then 'Closed' else 'Open' end as 'Stat', CONVERT(varchar(15),open_hr,100) as ophr,CONVERT(varchar(15),close_hr,100) as clhr from Info.OfficeHour order by day_num asc"
    let rows1;
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(query1)
        ])
    }).then(results => {
        rows1 = results[0].recordset
        res.render('officehr', { layout: 'admin', rows1 })
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "Office Hours Not Found"});
    })
});

app.get('/showohr/:id', (req, res) => {
    const ohr_id = req.params.id;
    const query = "Select *,DATENAME(dw,day_num) as 'DayName',case when Info.OfficeHour.status=0 then 'Closed' else 'Open' end as 'Stat', CONVERT(varchar(15),open_hr,100) as ophr,CONVERT(varchar(15),close_hr,100) as clhr, case when Info.OfficeHour.status=0 then '0' else '1' end as txtstat from Info.OfficeHour where ohr_id="+ ohr_id +" order by day_num asc"
    let ohr_res;
    
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(query)
        ])
    }).then(results => {
        ohr_res= results[0].recordset;
        res.json(ohr_res);
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "Office Hour Not Found"});
    });
});

app.get("/aboutinfo",authMiddleware,(req,res)=>{
    const abt_qry = "Select *,case when is_image=1 then 'YES' else 'NO' end as imgstat from Info.About order by ABT_ORDER ASC";
    let row_abt;
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(abt_qry)
        ])
    }).then(results => {
        row_abt = results[0].recordset
        res.render('aboutinfo', { layout: 'admin', row_abt })
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "About Info Not Found"});
    })
});

app.get('/showabt/:id', (req, res) => {
    const abt_id = req.params.id;
    const query = "Select *,case when is_image=1 then 'YES' else 'NO' end as imgstat, case when is_image=1 then '1' else '0' end statTxt from Info.About where ABT_ID="+ abt_id +" order by ABT_ORDER ASC ";
    let abt_res;
    
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(query)
        ])
    }).then(results => {
        abt_res= results[0].recordset;
        res.json(abt_res);
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "About Info Not Found"});
    });
});

app.get('/showacc/:id', (req, res) => {
    const acc_id = req.params.id;
    const query="Select a.*, case when a.is_active=1 then 'Active' else 'Deactive' end as Stat, case when a.is_admin=1 then 'Admin' else 'User' end as user_type, case when a.is_admin=1 then a.fname else b.d_fname end as u_fname, case when a.is_admin=1 then a.lname else b.d_lname end as u_lname from Admin.Accounts a left join Donation.Donors b on b.donor_id=a.donor_id where a.acc_id=" + acc_id;
    let acc_res;
    
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(query)
        ])
    }).then(results => {
        acc_res= results[0].recordset;
        res.json(acc_res);
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "Account Info Not Found"});
    });
});

app.get('/donors/provinces/:countryCode', (req, res) => {
    const countryCode = req.params.countryCode;
    const query = "Select a.* from SysInfo.Provinces a where a.CNT_ID="+ countryCode +" order by a.PROV_TEXT";
    let prov_res;
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(query)
        ])
    }).then(results => {
        prov_res= results[0].recordset;
        res.json(prov_res);
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "Province Not Found"});
    });
});

app.get('/donors/cities/:province', (req, res) => {
    const provinceCode = req.params.province;
    const query = "Select a.* from SysInfo.Cities a where a.PROV_ID="+ provinceCode +" order by a.CT_NAME";
    let city_res;
    
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(query)
        ])
    }).then(results => {
        city_res= results[0].recordset;
        res.json(city_res);
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "City Not Found"});
    });
});

app.get("/donors/add", authMiddleware, (req,res)=>{
    const cnt_query = "Select a.* from SysInfo.Countries a order by a.CNT_Long";
    let cnt_res;
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(cnt_query)
        ])
    }).then(results => {
        cnt_res = results[0].recordset;
        res.render('adddonors', { layout: 'admin', cnt_res })
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "Country Not Found"});
    })
});

app.get("/donors",authMiddleware,(req,res)=>{
    const donor_query = "Select *, case when is_active=1 then 'Active' else 'Deactive' end as d_stat from Donation.Donors where is_active=1";
    let donor_res;
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(donor_query)
        ])
    }).then(results => {
        donor_res = results[0].recordset;
        res.render('donors', { layout: 'admin', donor_res })
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "Donors Not Found"});
    })
});

app.get('/appeals/provinces/:countryCode', (req, res) => {
    const countryCode = req.params.countryCode;
    const query = "Select a.* from SysInfo.Provinces a where a.CNT_ID="+ countryCode +" order by a.PROV_TEXT";
    let prov_res;
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(query)
        ])
    }).then(results => {
        prov_res= results[0].recordset;
        res.json(prov_res);
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "Province Not Found"});
    });
});

app.get('/appeals/cities/:province', (req, res) => {
    const provinceCode = req.params.province;
    const query = "Select a.* from SysInfo.Cities a where a.PROV_ID="+ provinceCode +" order by a.CT_NAME";
    let city_res;
    
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(query)
        ])
    }).then(results => {
        city_res= results[0].recordset;
        res.json(city_res);
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "City Not Found"});
    });
});

app.get("/appeals",authMiddleware,(req,res)=>{
    const ap_query = "Select *, case when is_active=1 then 'Active' else 'Deactive' end as ap_stat from Donation.Appeals where is_active=1";
    let ap_res;
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(ap_query)
        ])
    }).then(results => {
        ap_res = results[0].recordset;
        res.render('appeals', { layout: 'admin', ap_res })
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "Appeals Not Found"});
    })
});

app.get("/appeals/add", authMiddleware, (req,res)=>{
    const cnt_query = "Select a.* from SysInfo.Countries a order by a.CNT_Long";
    let cnt_res;
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(cnt_query)
        ])
    }).then(results => {
        cnt_res = results[0].recordset;
        res.render('addappeals', { layout: 'admin', cnt_res })
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "Country Not Found"});
    })
});

app.get("/newseventinfo/:ne_id", (req,res)=>{
    const ne_id = req.params.ne_id;
    const ne_query = "Select *, case when ne_type=1 then 'News' when ne_type=2 then 'Events' end as type_txt, FORMAT(ne_dtpost, 'MMM dd yyyy hh:mm tt') as dtname from Info.NewsEvents where ne_id=" + ne_id;
    let contac, ne_res;
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(loc_query),
            pool.request().query(ne_query),
        ])
    }).then(results => {
        contac = results[0].recordset
        ne_res = results[1].recordset
        res.render('newseventinfo', { contac,ne_res })
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "News Events Not Found"});
    })
});

app.get("/newsevents",authMiddleware,(req,res)=>{
    const ne_query = "Select *, case when ne_type=1 then 'News' when ne_type=2 then 'Events' end as type_txt, FORMAT(ne_dtpost, 'MMM dd yyyy hh:mm tt') as dtname from Info.NewsEvents where is_delete=0 order by ne_dtpost DESC";
    let ne_res;
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(ne_query)
        ])
    }).then(results => {
        ne_res = results[0].recordset;
        res.render('newsevents', { layout: 'admin', ne_res })
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "News Events Not Found"});
    })
});

app.get("/newsevents/add", authMiddleware, (req,res)=>{
    const query = "SELECT GETDATE()";
    let resu;
    tcfData.initialize().then(pool=>{
        return Promise.all([
            pool.request().query(query)
        ])
    }).then(results => {
        resu = results[0].recordset;
        res.render('addnewsevents', { layout: 'admin', resu })
    }).catch(err => {
        console.error(err)
        res.status(500).render("error404",{message: "Database Not Found"});
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
            if(loginData[0].is_admin==true){
                res.redirect("donors");
            }
            else if(loginData[0].is_admin==false){
                res.status(500).render("error404",{message: "Under Maintenance"});
            }
        } else {
            res.render('home', { message: 'Invalid username or password' });
        }
    }).catch(err=>{
        console.error(err)
        res.status(500).render("error404",{message: "Unable to Login"});
    });
});

app.post("/saveaccount",(req,res)=>{
    tcfData.SAVE_ACCOUNT(req.body).then(()=>{
        res.redirect("/createaccount");
    }).catch(err=>{
        console.error(err)
        res.status(500).render("error404",{message: "Account Not Saved"});
    });
});

app.post("/updatelocation",(req,res)=>{
    tcfData.UPDATE_LOCATION(req.body).then(()=>{
        res.redirect("/location");
    }).catch(err=>{
        console.error(err)
        res.status(500).render("error404",{message: "Location Info Not Saved"});
    });
});

app.post("/updateofficehr/:id",(req,res)=>{
    const ohr_id = req.params.id;
    tcfData.UPDATE_OFFICEHR(req.body,ohr_id).then(()=>{
        res.redirect("/officehr");
    }).catch(err=>{
        console.error(err)
        res.status(500).render("error404",{message: "Office Hour Info Not Saved"});
    });
});

app.post("/saveabout",(req,res)=>{
    tcfData.SAVE_ABOUTINFO(req.body).then(()=>{
        res.redirect("/aboutinfo");
    }).catch(err=>{
        console.error(err)
        res.status(500).render("error404",{message: "About Info Not Saved"});
    });
});

app.post("/updateabout/:id",(req,res)=>{
    const abt_id = req.params.id;
    tcfData.UPDATE_ABOUTINFO(req.body,abt_id).then(()=>{
        res.redirect("/aboutinfo");
    }).catch(err=>{
        console.error(err)
        res.status(500).render("error404",{message: "About Info Not Saved"});
    });
});

app.post("/updateaccount/:id",(req,res)=>{
    const acc_id = req.params.id;
    tcfData.UPDATE_ACCOUNT(req.body,acc_id).then(()=>{
        res.redirect("/createaccount");
    }).catch(err=>{
        console.error(err)
        res.status(500).render("error404",{message: "Account Info Not Saved"});
    });
});

app.post("/savedonor",(req,res)=>{
    tcfData.SAVE_DONOR(req.body).then(()=>{
        res.redirect("/donors");
    }).catch(err=>{
        console.error(err)
        res.status(500).render("error404",{message: "Donor Info Not Saved"});
    });
});

app.post("/saveappeal",(req,res)=>{
    tcfData.SAVE_APPEAL(req.body).then(()=>{
        res.redirect("/appeals");
    }).catch(err=>{
        console.error(err)
        res.status(500).render("error404",{message: "Appeal Info Not Saved"});
    });
});

app.post("/savenewsevents",(req,res)=>{
    req.body.dtnow = torontoTime.format('MM-D-YYYY h:mm:ss');
    tcfData.SAVE_NEWSEVENTS(req.body).then(()=>{
        res.redirect("/newsevents");
    }).catch(err=>{
        console.error(err)
        res.status(500).render("error404",{message: "News Events Info Not Saved"});
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