import express from "express";
import bodyParser from "body-parser";
import sql from "mssql";

const config ={
    user:'sa',
    password:'sa',
    server:'localhost',
    database:'AccDB',
    options:{
        encrypt:false,
        trustServerCertificate: true
    }
};
sql.connect(config)
.then( async pool =>{
    console.log('connected to database')
    const result =  await pool.request().query("SELECT * FROM Users") 
    console.log(result.recordset);
    return pool
})
.catch(err =>console.error("SQL conncection error", err));
const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));


app.get("/", async(req, res)=>{
 res.render("/login.ejs")
})

app.get("/signup", (req, res) =>{
    res.render("signup.ejs")
})

app.listen(port, () =>{
    console.log("listening on port", port);
})