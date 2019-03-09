const execSync = require('child_process').execSync

function exec (cmd) {

  execSync(cmd, {stdio: [0, 1, 2]})

}

module.exports = exec
