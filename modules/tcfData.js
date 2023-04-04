const  sql = require("mssql");
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
