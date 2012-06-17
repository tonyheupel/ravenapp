var fs = require('fs')
  , path = require('path')
  , ravendb = require('ravendb')
  , ArgumentParser = require('argparse').ArgumentParser


var version = '0.0.2' // update package.json

var addFiles = function(appName, appDir, rootDir, db, callback) {
  fs.readdir(rootDir, function(err, files) {
    files.forEach(function(filename) {
      filename = rootDir + '/' + filename

     fs.stat(filename, function (err, stat) {
        if (err) { callback(err); return; }
        if (stat.isDirectory()) {
          addFiles(appName, appDir, filename, db, function(err, cb) {
            if (err) { callback(err); return;}
            else console.log('Added files for "' + filename + '"')
          })
        } else {
          // Save Attachment here
          var appRoot = 'apps/' + appName
          var docId = appRoot.replace(appDir, '')

          //if (!/index\.html$/.test(filename)) 
          docId += filename.replace(appDir, '')

          // Add deleteAttachment to ravendb module
          db.deleteAttachment(docId, function(err, resp) {
            db.saveAttachment(docId, fs.createReadStream(filename), function(err, result) {
              if (err) { callback(err); return; }
              else console.log('Saved "' + filename + '" to "' + docId + '"')
            })  
          })
          
        }
      })
    })
  })
}

var saveApp = function(args, cb) {
  
  // Need to strip trailing /
  var appDir = args.directory
    , appName = args.name
    , dbUrl = args.store
    , dbName = args.database
    , ravenHqApiKey = args.apiKey
    
  appDir = appDir[appDir.length - 1] === '/' ? appDir.substring(0, appDir.length - 1) : appDir

  var db = ravendb(dbUrl, dbName)
  if (/ravenhq\.com/.test(dbUrl) && ravenHqApiKey) { 
    db.useRavenHq(ravenHqApiKey, function(err, auth) { // If api key is null, this has no effect
      addFiles(appName, appDir, appDir, db, function(e,r) {
        if (e) console.log('Error in saveApp: ' + e)
        else console.log('Finished saving app: ' + r)
      })
    })
  } else {
    addFiles(appName, appDir, appDir, db, function(e,r) {
      if (e) console.log('Error in saveApp: ' + e)
      else console.log('Finished saving app: ' + r)
    })
  }  
}

var parser = new ArgumentParser({
  'version': version,
  addHelp: true,
  description: 'RavenApp builder'
});
parser.addArgument(
  [ '-d', '--directory' ],
  {
    help: 'base directory for the RavenApp',
    dest: 'directory'
  }
)
parser.addArgument(
  [ '-n', '--name' ],
  {
    help: 'the name of the RavenApp',
    dest: 'name'
  }
)
parser.addArgument(
  [ '-s', '--store' ],
  {
    help: 'specify which data store to use (defaults to http://localhost:8080 if not specfied)',
    defaultValue: 'http://localhost:8080',
    dest: 'store'
  }
)
parser.addArgument(
  [ '-db', '--database'],
  {
    help: 'specify which database to use (defaults to "Default" if not specified)',
    defaultValue: 'Default',
    dest: 'database'
  }
)
parser.addArgument(
  [ '-key', '--apikey'],
  {
    help: 'specity the api key to use with RavenHQ databases',
    defaultValue: null,
    dest: 'apiKey'
  }
)

var args = parser.parseArgs();

saveApp(args)