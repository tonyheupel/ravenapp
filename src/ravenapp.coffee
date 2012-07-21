fs = require('fs')
path = require('path')
ravendb = require('ravendb')
ArgumentParser = require('argparse').ArgumentParser


version = '0.0.3' # update package.json

addFiles = (appName, appDir, rootDir, db, callback) ->
  fs.readdir rootDir, (err, files) ->
    files.forEach (filename) ->
      filename = "#{rootDir}/#{filename}"

      fs.stat filename, (err, stat) ->
        if err? 
          callback(err)
          return

        if stat.isDirectory()
          addFiles appName, appDir, filename, db, (err, resp) ->
            if err?
              callback(err)
              return
            else
              console.log "Added files for #{filename}"
              callback(null, resp)

        else
          # Save Attachment here
          appRoot = "apps/#{appName}"
          docId = appRoot.replace(appDir, '')

          # if (!/index\.html$/.test(filename))
          docId += filename.replace(appDir, '')

          # Add deleteAttachment to ravendb module
          db.deleteAttachment docId, (err, resp) ->
            db.saveAttachment docId, fs.createReadStream(filename), (err, result) ->
              if err?
                callback(new Error("Error saving \"#{filename}\": #{err}"), err, result)
              else if result?.statusCode? is not 201
                callback(new Error("Problem saving \"#{filename}\": #{result}"))
              else
                console.log "Saved \"#{filename}\" to \"#{docId}\""
                callback(null, result)



saveApp = (args, cb) ->
  # Need to strip trailing /
  appDir = args.directory
  appName = args.name
  dbUrl = args.store
  dbName = args.database
  ravenHqApiKey = args.apiKey

  appDir = if appDir[appDir.length - 1] is '/' then appDir.substring(0, appDir.length - 1) else appDir

  db = ravendb(dbUrl, dbName)
  if /ravenhq\.com/.test(dbUrl) and ravenHqApiKey
    db.useRavenHq ravenHqApiKey, (err, auth) -> # If api key is null, this has no effect
      addFiles appName, appDir, appDir, db, (e,r) ->
        if e? then console.log "Error in saveApp: #{e}"
        else console.log "Finished saving app: #{r}"

        cb(e,r)
  else
    addFiles appName, appDir, appDir, db, (e,r) ->
      if e? then console.log "Error in saveApp: #{e}"
      else console.log "Finished saving app: #{r}"

      cb(e,r)


parser = new ArgumentParser
  'version': version
  addHelp: true
  description: 'RavenApp builder'

parser.addArgument [ '-d', '--directory' ],
  help: 'base directory for the RavenApp'
  dest: 'directory'
  required: true

parser.addArgument [ '-n', '--name' ],
  help: 'the name of the RavenApp'
  dest: 'name'
  required: true

parser.addArgument [ '-s', '--store' ],
  help: 'specify which data store to use (defaults to http://localhost:8080 if not specfied)'
  defaultValue: 'http://localhost:8080'
  dest: 'store'

parser.addArgument [ '-db', '--database'],
  help: 'specify which database to use (defaults to "Default" if not specified)'
  defaultValue: 'Default'
  dest: 'database'

parser.addArgument [ '-key', '--apikey'],
  help: 'specity the api key to use with RavenHQ databases',
  defaultValue: null,
  dest: 'apiKey'


args = parser.parseArgs()

saveApp args, (err, resp) ->
 if err? then console.error err
 else
   console.log 'Done.'
