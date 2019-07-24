const AWS = require('aws-sdk');
const fs = require('fs');
let argv = require('minimist')(process.argv.slice(2));

if(!argv.userPoolId) console.error('userPoolId must be set!');

const UserPoolId = argv.userPoolId;
const region = argv.region || 'eu-west-2';
const profile = argv.profile || 'default';
const fileName = argv.filename + '.bat' || 'script.bat';

let credentials = new AWS.SharedIniFileCredentials({
  profile
});

AWS.config.credentials = credentials;

if (!AWS.config.region) {
  AWS.config.update({
    region
  });
};

const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

getUserGroups()
  .then(groups => {
    let promises = [];

    groups.forEach(group => {
      promises.push(
        getGroupCommands(group.GroupName)
        .then(commands => {
          return commands;
        })
        .catch(err => console.log(err, err.stack))
      );
    });

    return Promise.all(promises).then(commandArrays => {
      fs.writeFile(fileName, '', () => {})

      let writeStream = fs.createWriteStream(fileName);
      writeStream.write("@echo off \n" + "echo Adding users to groups... \n");

      for (let i = 0; i < commandArrays.length; i++) {
        let array = commandArrays[i];
        if (array.length) {
          for (let y = 0; y < array.length; y++) {
            let command = array[y];
            writeStream.write(command + "\n");
          }
        }
      }

      writeStream.write("echo Done.");

      writeStream.on('finish', () => {
        console.log(`Successfully created file: ${process.cwd()} ${fileName}`);
      });

      writeStream.end();
    });
  })
  .catch(err => console.log(err, err.stack));

function getUserGroups() {
  let groupsReq = cognitoidentityserviceprovider.listGroups({ UserPoolId }, () => {});

  let promise = new Promise((resolve, reject) => {
    return groupsReq.on('success', response => {
        let userGroups = response.data.Groups;
        resolve(userGroups);
      })
      .on('error', error => {
        reject(error);
      });
  });

  return promise;
};

function getGroupCommands(GroupName) {
  let params = {
    GroupName,
    UserPoolId
  };
  let usersReq = cognitoidentityserviceprovider.listUsersInGroup(params, () => {});

  let promise = new Promise((resolve, reject) => {
    return usersReq.on('success', response => {
        let users = response.data.Users;
        let commands = [];

        users.forEach(user => {
          let command = `call aws cognito-idp admin-add-user-to-group --user-pool-id ${UserPoolId} --group-name ${GroupName} --username ${user.Username}`;
          commands.push(command);
        });

        resolve(commands);
      })
      .on('error', error => {
        reject(error);
      })
  });

  return promise;
};