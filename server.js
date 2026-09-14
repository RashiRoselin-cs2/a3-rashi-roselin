require( 'dotenv' ).config()
const fs   = require( 'fs' ),
      mime = require( 'mime' ),
      dir  = 'public/',
      port = 3000,
      express = require('express'),
      cookie  = require( 'cookie-session' ),
      { MongoClient, ObjectId } = require("mongodb"),
      app = express()

const uri = `mongodb+srv://rashiroselin_db_user:50LgsYkMI3fCbLLS@cluster0.eun1u9f.mongodb.net/?appName=Cluster0`
const appdata = []
const accounts = [
    {username: 'Rashi', password: 'test'}
]
const client = new MongoClient( uri )
let collection = null

// ==========================================
// 1. MANDATORY PARSERS & COOKIES (MUST BE FIRST)
// ==========================================
app.use( express.json() ) 
app.use( express.urlencoded({ extended:true }) )

app.use( cookie({
  name: 'session',
  keys: ['kljsfdhkljsfdhkjlasfhfdkhlas', 'kasadbdasihdsfaidfsfsdc'],
  httpOnly: false
}))

// ==========================================
// 2. MONGO DATABASE BOOTSTRAP CONNECTION
// ==========================================
async function run() {
  try {
    await client.connect()
    collection = await client.db( "playerstats" ).collection( "players" )
    console.log("Database connection established successfully!");
  } catch (err) {
    console.error("Database connection failed:", err);
  }
}
run(); // Fires the async connection engine

// Optional safety check: Blocks subsequent routes if the DB hasn't connected yet
app.use( (req, res, next) => {
  if( collection !== null || req.path === '/login' ) { 
    next()
  } else {
    res.status( 503 ).send("Database initializing... Please refresh shortly.")
  }
})

// ==========================================
// 3. STATIC WEBPAGE AND VIEW FILE SERVERS
// ==========================================
app.use( express.static( 'public' ) )
app.use( express.static( 'views'  ) )

// ==========================================
// 4. ROUTE ENDPOINTS
// ==========================================

app.get( '/', function( req, res ) {
  res.redirect( '/index.html' )
})

app.get("/docs", async (req, res) => {
  if (collection !== null) {
    const docs = await collection.find({}).toArray()
    res.json( docs )
  } else {
    res.json([])
  }
})

app.post( '/login', (req, res) => {
  // express.json() catches this cleanly now!
  const { username, password } = req.body
  
  console.log("===============================");
  console.log("Login data received:", req.body )
  console.log("Password entered:", password)
  console.log("===============================");
  let correct = false
  let exists = false
  for (let item of accounts) {
    if (username === item.username) {
        if (item.password === password) {
            correct = true
        }
        exists = true
        break
    }
  }
  if (!exists) {
    accounts.push({username: username, password: password})
    correct = true
  }
  if( correct && exists ) {
    req.session.login = true
    req.session.username = username
    res.json({ success: true, message: "Logged in successfully!" })
  } else if (correct && !exists ) {
    req.session.login = true
    req.session.username = username
    res.json({ success: true, message: "New user created!" })
  } else {
    res.status(401).json({ success: false, message: "Incorrect password." })
  }
})

app.post( '/submit', function( req, res ) {
  const incomingData = req.body;

  // Verify the payload exists before pushing
  if (incomingData && Object.keys(incomingData).length > 0 && incomingData.name !== undefined) {
    appdata.push( incomingData )
  }
const names = []
  let flag = false
  const removal = []
  
  // Set headers using Express syntax
  res.setHeader('Content-Type', 'application/json');

  for (let i = appdata.length - 1; i >= 0; i--) {
    const item = appdata[i];
    if (item.avg === 'remove') {
      removal.push(item.name);
      appdata.splice(i, 1);
    }
    else if (removal.includes(item.name)) {
      appdata.splice(i, 1);
    }
  }

  for (let i = 0; i < appdata.length; i++) {
    const item = appdata[i];
    if (item.name === '') {
      appdata.splice(i, 1);
      i--;
    }
    else if (item.avg > 1 || item.avg < 0 || item.obp > 1 || item.obp < 0 || item.slg > 4 || item.slg < 0) {
      appdata.splice(i, 1);
      i--;
    }
    else if (names.includes(item.name)) {
      var duplicateIndex = names.indexOf(item.name);
      if (item.avg > 0 && item.obp > 0 && item.slg > 0 && item.avg < 1 && item.obp < 1 && item.slg < 4) {
        appdata[duplicateIndex] = item;
      }
      flag = true;
    }
    else {
      names.push(item.name);
    }
  }

  if (flag) {
    appdata.pop()
  }
  res.json( appdata );
})


// Native file recovery wrapper fallback (if needed)
const sendFile = (response, filename) => {
  const type = mime.getType(filename)
  fs.readFile(filename, function (err, content) {
    if (err === null) {
      response.writeHeader(200, { 'Content-Type': type })
      response.end(content)
    } else {
      response.writeHeader(404)
      response.end('404 Error: File Not Found')
    }
  })
}

// ==========================================
// 5. APPLICATION PORTS LISTENER ENGINE
// ==========================================
app.listen( process.env.PORT || port, () => {
  console.log(`Server executing cleanly on port ${port}`);
})
