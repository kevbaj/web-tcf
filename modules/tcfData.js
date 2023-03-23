const Sequelize = require('sequelize');
var sequelize = new Sequelize('parjcmhh', 'parjcmhh', 'cFoNozzRHcC8KMiR1SoL1M_aY6dHnfjd', {
    host: 'peanut.db.elephantsql.com',
    dialect: 'postgres',
    port: 5432,
    dialectOptions: {
    ssl: { rejectUnauthorized: false }
    },
    query:{ raw: true }
});

module.exports.initialize= function(){
    return new Promise((resolve,reject)=>{
        sequelize.sync().then(()=>{
            resolve();
        }).catch(err=>{
            reject("Unable to Sync the Database");
        })
    });
}