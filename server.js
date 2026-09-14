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
app.use( express.json() ) 
app.use( express.urlencoded({ extended:true }) )

app.use( cookie({
  name: 'session',
  keys: ['kljsfdhkljsfdhkjlasfhfdkhlas', 'kasadbdasihdsfaidfsfsdc'],
  httpOnly: false
}))
async function run() {
  try {
    await client.connect()
    collection = await client.db( "playerstats" ).collection( "players" )
    console.log("Database connection established successfully!");
  } catch (err) {
    console.error("Database connection failed:", err);
  }
}
run();
app.use( (req, res, next) => {
  if( collection !== null || req.path === '/login' ) { 
    next()
  } else {
    res.status( 503 ).send("Database initializing... Please refresh shortly.")
  }
})
app.use( express.static( 'public' ) )
app.use( express.static( 'views'  ) )
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
    res.json({ success: true, isNewUser: false, message: "Logged in successfully!" })
  } else if (correct && !exists ) {
    req.session.login = true
    req.session.username = username
    res.json({ success: true, isNewUser: true, message: "New user created!" })
  } else {
    res.status(401).json({ success: false, message: "Incorrect password." })
  }
})
/**
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
*/
app.post( '/submit', async function( req, res ) {
  res.setHeader('Content-Type', 'application/json');

  if (!collection) {
    return res.status(503).json({ error: "Database not connected yet" });
  }
  const currentUsername = req.session.username;
  
  if (!req.session.login || !currentUsername) {
    return res.status(401).json({ error: "Unauthorized. Please log in first." });
  }

  const incomingData = req.body;

  try {
    if (incomingData.avg === 'remove') {
      await collection.deleteOne({ 
        name: incomingData.name, 
        owner: currentUsername
      });
      
      const updatedDocs = await collection.find({ owner: currentUsername }).toArray();
      return res.json(updatedDocs);
    }
    if (!incomingData.name || incomingData.name === '') {
      const userSpecificDocs = await collection.find({ owner: currentUsername }).toArray();
      return res.json(userSpecificDocs);
    }
    const avgNum = parseFloat(incomingData.avg);
    const obpNum = parseFloat(incomingData.obp);
    const slgNum = parseFloat(incomingData.slg);

    if (avgNum > 1 || avgNum < 0 || obpNum > 1 || obpNum < 0 || slgNum > 4 || slgNum < 0) {
      const currentDocs = await collection.find({ owner: currentUsername }).toArray();
      return res.json(currentDocs);
    }
    const playerDocument = {
      name: incomingData.name,
      avg: incomingData.avg,
      obp: incomingData.obp,
      slg: incomingData.slg,
      owner: currentUsername 
    };

    await collection.updateOne(
      { name: incomingData.name, owner: currentUsername }, 
      { $set: playerDocument },      
      { upsert: true }             
    );
    const freshDocs = await collection.find({ owner: currentUsername }).toArray();
    res.json(freshDocs);

  } catch (error) {
    console.error("Database operation error:", error);
    res.status(500).json({ error: "Internal Database Error" });
  }
});

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
app.listen( process.env.PORT || port, () => {
  console.log(`Server executing cleanly on port ${port}`);
})
