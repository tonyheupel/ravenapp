var fs = require('fs')
  , ravendb = require('ravendb')

var addFiles = function(appName, rootDir, db, callback) {
  fs.readdir(rootDir, function(err, files) {
    files.forEach(function(filename) {
      filename = rootDir + '/' + filename

     fs.stat(filename, function (err, stat) {
        if (err) { callback(err); return; }
        if (stat.isDirectory()) {
          addFiles(appName, filename, db, function(err, cb) {
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
          db.apiDeleteCall(db.getAttachmentUrl(docId), function(err, resp) {
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

var saveApp = function(appName, appDir, dbUrl, cb) {
  addFiles(appName, appDir, ravendb(dbUrl), function(e,r) {
    if (e) console.log('Error in saveApp: ' + e)
    else console.log('Finished saving app: ' + r)
  })
}

var appName = 'studio'
  , dbUrl = 'http://localhost/ravendb'
  , appDir = '../http-ravendb/public'

saveApp(appName, appDir, dbUrl)