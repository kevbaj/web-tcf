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
        const logquery="SELECT * FROM Admin.Accounts WHERE uname = @uname AND pword = @pword and is_active=1"
        sql.connect(sqlConfig).then(pool=>{
            return pool.request()
            .input('uname', sql.NVarChar, txtuname)
            .input('pword', sql.NVarChar, txtpword)
            .query(logquery)
        }).then(result=>{
            let loginResult = result.recordset;
            console.error(loginResult);
            resolve(loginResult);
        }).catch(err => {
            console.error(err);
            reject("Unable to Login");
        })
    })
}