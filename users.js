const AWS = require('aws-sdk');
const fs = require('fs');
let argv = require('minimist')(process.argv.slice(2));
let https = require('https');

let errors = [];

if(argv.userPoolId.length === 0) errors.push('userPoolId must be set!');
if(argv.groupName.length === 0) errors.push('groupName must be set!');
if(argv.userCount > 15) errors.push('userCount must be 20 or less!');

if(errors.length) {
  for (let i = 0; i < errors.length; i++) {
    console.error(errors[i]);
    process.exit();
  }
}

const UserPoolId = argv.userPoolId;
const region = argv.region || 'eu-west-2';
const profile = argv.profile || 'default';
const userCount = argv.userCount || 15;
const GroupName = argv.groupName;

let credentials = new AWS.SharedIniFileCredentials({
  profile
});

AWS.config.credentials = credentials;

let agent = new https.Agent({
  maxSockets: Infinity
});

if (!AWS.config.region) {
  AWS.config.update({
    region
  });
};

const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider({
  httpOptions: {
    agent
  }
});

setTimeout(() => {}, 5000);

(async () => {
  let res = await listGroups();
  let groups = res.Groups;
  let found = false;
  
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (group.GroupName == GroupName) found = true;
    }

    if (found) {
      for (let index = 0; index < userCount; index++) {
        let email = generateEmail(30);
        let createUserRes = await createUser(UserPoolId, email);
        let user = createUserRes.User;

        await addUserToGroup(user);
      }

      console.log(`${userCount} users added to ${GroupName} user group.`);
    } else {
      console.error('Group name not found.');
      process.exit(22);
    }
})();

async function listGroups() {
  let params = {
    UserPoolId
  };

  return await cognitoidentityserviceprovider.listGroups(params, () => {}).promise();
}

function generateEmail(length) {
  let charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      string = '';

  if(!length) length = 16

  for (var i = 0, n = charset.length; i < length; ++i) {
    string += charset.charAt(Math.floor(Math.random() * n));
  }

  return string += '@gmail.com';
}

async function createUser(UserPoolId, Username) {
  let params = {
    UserPoolId,
    Username
  };

  return await cognitoidentityserviceprovider.adminCreateUser(params, () => {}).promise();
}

async function addUserToGroup(user) {
  let params = {
    GroupName,
    UserPoolId,
    Username: user.Username
  };

  return await cognitoidentityserviceprovider.adminAddUserToGroup(params, () => {}).promise();
}
