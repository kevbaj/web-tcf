const sql = require("mssql");
const sqlConfig = {
    user: 'admin',
    password: 'sapassw0rd',
    server: 'dbtcf.cceiephcgn5r.us-east-1.rds.amazonaws.com', 
    database: 'db_TCF',
    options: {
        trustServerCertificate: true 
    }
};

const pool = new sql.ConnectionPool(sqlConfig)

module.exports.initialize= function(){
    return new Promise((resolve, reject) => {
        pool.connect(err => {
            if (err) {
                reject(err)
            } else {
                resolve(pool)
            }
        })
    });
}

module.exports.SUBMIT_INQUIRY=function(inqData){
    return new Promise((resolve,reject)=>{
        const { fname, email, org, inquiry } = inqData;
        sql.connect(sqlConfig).then(pool => {
            return pool.request()
            .input('fname', sql.NVarChar, fname)
            .input('email', sql.NVarChar, email)
            .input('org', sql.NVarChar, org)
            .input('inquiry', sql.NVarChar, inquiry)
            .query('INSERT INTO Info.Inquiry(inq_datetime, inq_fullName,inq_email,inq_orgName,inq_text) VALUES (GETDATE(),@fname, @email,@org,@inquiry)')
        }).then(() => {
            resolve();
        }).catch(err => {
            reject("Unable to Submit Inquiry");
        })
    });
}

module.exports.searchLogin=function(loginData){
    return new Promise((resolve,reject)=>{
        const { txtuname, txtpword } = loginData;
        const logquery="SELECT TOP 1 * FROM Admin.Accounts WHERE uname = @uname and pword= @pword and is_active=1"
        sql.connect(sqlConfig).then(pool=>{
            return pool.request()
            .input('uname', sql.NVarChar, txtuname)
            .input('pword', sql.NVarChar, txtpword)
            .query(logquery)
        }).then(result=>{
            let loginResult = result.recordset;
            resolve(loginResult);
        }).catch(err => {
            console.error(err);
            reject("Unable to Login");
        })
    })
}

module.exports.SAVE_ADMINACCOUNT=function(accData){
    return new Promise((resolve,reject)=>{
        const { fname, lname, jpos, uname, pword } = accData;
        sql.connect(sqlConfig).then(pool => {
            return pool.request()
            .input('fname', sql.NVarChar, fname)
            .input('lname', sql.NVarChar, lname)
            .input('jpos', sql.NVarChar, jpos)
            .input('uname', sql.NVarChar, uname)
            .input('pword', sql.NVarChar, pword)
            .query('INSERT INTO Admin.Accounts(fname,lname,jpos,uname,pword,is_active) VALUES (@fname, @lname,@jpos,@uname, @pword, 1)')
        }).then(() => {
            resolve();
        }).catch(err => {
            reject("Unable to Add Account");
        })
    });
}

module.exports.UPDATE_CONTACT=function(contData){
    return new Promise((resolve,reject)=>{
        const { addr, city, prov, country, postal, phone, emailadd } = contData;
        sql.connect(sqlConfig).then(pool => {
            return pool.request()
            .input('addr', sql.NVarChar, addr)
            .input('city', sql.NVarChar, city)
            .input('prov', sql.NVarChar, prov)
            .input('country', sql.NVarChar, country)
            .input('postal', sql.NVarChar, postal)
            .input('phone', sql.NVarChar, phone)
            .input('emailadd', sql.NVarChar, emailadd)
            .query('UPDATE Info.Location set loc_addr=@addr, loc_city=@city, loc_prov=@prov, loc_country=@country, loc_postal=@postal, loc_phone=@phone, loc_emailaddr=@emailadd where ID=1')
        }).then(() => {
            resolve();
        }).catch(err => {
            reject("Unable to Update Contact Info");
        })
    });
}