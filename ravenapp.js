var fs = require('fs')
  , ravendb = require('ravendb')
  , ArgumentParser = require('argparse').ArgumentParser


var version = '0.0.1' // update package.json

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
          // Add attachment to ravendb
          var mimeTypes = {   'text/html': /\.html$/
                            , 'text/css': /\.css$/
                            , 'text/javascript': /\.js$/
          }
          var mimeType = 'text/plain'
          for(var type in mimeTypes) {
            if (mimeTypes[type].test(filename)) {
              mimeType = type
              break
            }
          }

          // Save Attachment here
          var appRoot = 'apps/' + appName
          var docId = appRoot.replace(appDir, '')

          //if (!/index\.html$/.test(filename)) 
          docId += filename.replace(appDir, '')

          // Add deleteAttachment to ravendb module
          db.deleteAttachment(docId, function(err, resp) {
            db.saveAttachment(docId, fs.readFileSync(filename, 'UTF-8'), { 'Content-Type': mimeType }, function(err, result) {
              if (err) { callback(err); return; }
              else console.log('Saved "' + filename + '" to "' + docId + '"')
            })  
          })
          
        }
      })
    })
  })
}

var saveApp = function(appName, appDir, dbUrl, dbName, cb) {
  if (typeof dbName === 'function') dbName = null

  addFiles(appName, appDir, appDir, ravendb(dbUrl, dbName), function(e,r) {
    if (e) console.log('Error in saveApp: ' + e)
    else console.log('Finished saving app: ' + r)
  })
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

var args = parser.parseArgs();

saveApp(args.name, args.directory, args.store, args.database)