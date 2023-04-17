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

module.exports.SAVE_ACCOUNT=function(accData){
    return new Promise((resolve,reject)=>{
        const { utype, donor, fname, lname, uname, pword } = accData;
        let is_admin,is_donor;
        if(utype=="Admin"){
            is_admin=true;
            is_donor=false;
        }
        else{
            is_admin=false;
            is_donor=true;
        }
        sql.connect(sqlConfig).then(pool => {
            return pool.request()
            .input('fname', sql.NVarChar, fname)
            .input('lname', sql.NVarChar, lname)
            .input('uname', sql.NVarChar, uname)
            .input('pword', sql.NVarChar, pword)
            .input('is_admin', sql.Bit, is_admin)
            .input('is_donor', sql.Bit, is_donor)
            .input('donor', sql.Int, donor)
            .query('INSERT INTO Admin.Accounts(fname,lname,uname,pword,is_active, is_admin,is_donor,donor_id) VALUES (@fname, @lname,@uname, @pword, 1, @is_admin, @is_donor, case when @is_donor=1 then @donor else NULL end)')
        }).then(() => {
            resolve();
        }).catch(err => {
            console.log(err);
            reject("Unable to Add Account");
        })
    });
}

module.exports.UPDATE_LOCATION=function(contData){
    return new Promise((resolve,reject)=>{
        const { addr, city, province, country, postal, phone, emailadd } = contData;
        sql.connect(sqlConfig).then(pool => {
            return pool.request()
            .input('addr', sql.NVarChar, addr)
            .input('city', sql.NVarChar, city)
            .input('province', sql.NVarChar, province)
            .input('country', sql.NVarChar, country)
            .input('postal', sql.NVarChar, postal)
            .input('phone', sql.NVarChar, phone)
            .input('emailadd', sql.NVarChar, emailadd)
            .query('UPDATE Info.Location set loc_addr=@addr, loc_city=@city, loc_prov=@province, loc_country=@country, loc_postal=@postal, loc_phone=@phone, loc_emailaddr=@emailadd where ID=1')
        }).then(() => {
            resolve();
        }).catch(err => {
            reject("Unable to Update Location Info");
        })
    });
}

module.exports.UPDATE_OFFICEHR=function(offData, ohrId){
    return new Promise((resolve,reject)=>{
        const { stat, ophr, clhr } = offData;
        sql.connect(sqlConfig).then(pool => {
            return pool.request()
            .input('stat', sql.NVarChar, stat)
            .input('ophr', sql.NVarChar, ophr)
            .input('clhr', sql.NVarChar, clhr)
            .query('Update Info.OfficeHour set status=cast(@stat as bit), open_hr=cast(@ophr as time), close_hr=cast(@clhr as time) where ohr_id= ' + ohrId)
        }).then(() => {
            resolve();
        }).catch(err => {
            console.log(err);
            reject("Unable to Update Office Hour");
        })
    });
}

module.exports.SAVE_ABOUTINFO=function(abtData){
    return new Promise((resolve,reject)=>{
        const { seq, imgstat, aname, atitle, adet } = abtData;
        sql.connect(sqlConfig).then(pool => {
            return pool.request()
            .input('seq', sql.NVarChar, seq)
            .input('imgstat', sql.NVarChar, imgstat)
            .input('aname', sql.NVarChar, aname)
            .input('atitle', sql.NVarChar, atitle)
            .input('adet', sql.NVarChar, adet)
            .query('INSERT INTO Info.About(ABT_NAME,ABT_TITLE,ABT_DET,ABT_ORDER,is_image) VALUES (@aname, @atitle,@adet,@seq, @imgstat)')
        }).then(() => {
            resolve();
        }).catch(err => {
            reject("Unable to Add Account");
        })
    });
}

module.exports.UPDATE_ABOUTINFO=function(abtData, abt_id){
    return new Promise((resolve,reject)=>{
        const { seq, imgstat, aname, atitle, adet } = abtData;
        sql.connect(sqlConfig).then(pool => {
            return pool.request()
            .input('seq', sql.NVarChar, seq)
            .input('imgstat', sql.NVarChar, imgstat)
            .input('aname', sql.NVarChar, aname)
            .input('atitle', sql.NVarChar, atitle)
            .input('adet', sql.NVarChar, adet)
            .query('Update Info.About set is_image=cast(@imgstat as bit), ABT_NAME=@aname, ABT_TITLE=@atitle, ABT_DET=@adet, ABT_ORDER=@seq where ABT_ID= ' + abt_id)
        }).then(() => {
            resolve();
        }).catch(err => {
            console.log(err);
            reject("Unable to Update About Info");
        })
    });
}

module.exports.UPDATE_ACCOUNT=function(accData, acc_id){
    return new Promise((resolve,reject)=>{
        const { utype, donor, fname, lname, uname, pword } = accData;
        let is_admin,is_donor;
        if(utype=="Admin"){
            is_admin=true;
            is_donor=false;
        }
        else{
            is_admin=false;
            is_donor=true;
        }
        sql.connect(sqlConfig).then(pool => {
            return pool.request()
            .input('fname', sql.NVarChar, fname)
            .input('lname', sql.NVarChar, lname)
            .input('uname', sql.NVarChar, uname)
            .input('pword', sql.NVarChar, pword)
            .input('is_admin', sql.Bit, is_admin)
            .input('is_donor', sql.Bit, is_donor)
            .input('donor', sql.Int, donor)
            .query('Update Admin.Accounts set fname=@fname, lname=@lname, uname=@uname, pword=@pword, is_admin=@is_admin, is_donor=@is_donor, donor_id= case when @is_donor=1 then @donor else NULL end where acc_id= ' + acc_id)
        }).then(() => {
            resolve();
        }).catch(err => {
            console.log(err);
            reject("Unable to Update About Info");
        })
    });
}

module.exports.SAVE_DONOR=function(donData){
    return new Promise((resolve,reject)=>{
        const { dtle, fname, lname, addr, country, province, city,postal,phone,emailadd} = donData;
        sql.connect(sqlConfig).then(pool => {
            return pool.request()
            .input('dtle', sql.NVarChar, dtle)
            .input('fname', sql.NVarChar, fname)
            .input('lname', sql.NVarChar, lname)
            .input('addr', sql.NVarChar, addr)
            .input('country', sql.NVarChar, country)
            .input('province', sql.NVarChar, province)
            .input('city', sql.NVarChar, city)
            .input('postal', sql.NVarChar, postal)
            .input('phone', sql.NVarChar, phone)
            .input('emailadd', sql.NVarChar, emailadd)
            .query('INSERT INTO Donation.Donors(d_title,d_fname,d_lname,d_addr,d_city,d_prov,d_country,d_postal,d_phone,d_email,is_active) VALUES (@dtle, @fname,@lname,@addr, @country, @province, @city, @postal, @phone, @emailadd, 1)')
        }).then(() => {
            resolve();
        }).catch(err => {
            reject("Unable to Add Donor");
        })
    });
}