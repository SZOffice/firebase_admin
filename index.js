var admin = require("firebase-admin");
const readline  = require('readline');
var serviceAccount = require("./hackathon-2018-firebase-adminsdk-ka5c5-b71032feec.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://hackathon-2018.firebaseio.com"
});

let getTokens = () => {
    return new Promise((resolve, reject) => {
        var db = admin.database();
        var ref = db.ref("advertiser");
        let browserTokens = [];
        let mobileTokens = [];
        ref.once("value", function(snapshot) {
          let advertisers = snapshot.val();
          for(let id in advertisers){
            for(let name in advertisers[id]){
                if(advertisers[id][name].source === 'mobile'){
                    mobileTokens.push(advertisers[id][name].token);
                }else{
                    browserTokens.push(advertisers[id][name].token);
                }
            }
          }
          resolve({
            browser: browserTokens,
            mobile: mobileTokens
          });
        });
    });
}

let sendNotification = (tokens, notification) => {
    return new Promise((resolve, reject) => {
        // console.log('sendNotification=', tokens, notification);
        // This registration token comes from the client FCM SDKs.
        // var registrationToken = "c1IU_y9K_9Y:APA91bE4lZ1mHGObaTkBIyq8KQ-YHYqK8tqf2s3h-pzw-d0-Pgw_bO8J691gF5v5B857Wxb2wRWM3A1RtBpnbgzKHf9KLzqYYabeyng4CtmPpDhWwPFL5JR7t7aLHNRmmhKA7GqU_UuJ";
    
        // See the "Defining the message payload" section below for details
        // on how to define a message payload.
        var payload = {
            notification
          };
    
        // Send a message to the device corresponding to the provided
        // registration token.
        admin.messaging().sendToDevice(tokens, payload).then(function(response) {
            // See the MessagingDevicesResponse reference documentation for
            // the contents of response.
            resolve(response);
        })
        .catch(function(error) {
            reject(error);
        });
    })    
}

let getNotificationTemplate = () => {
    return new Promise((resolve, reject) => {
        var db = admin.database();
        var ref = db.ref("template");
        let result = {};
        ref.once("value", function(snapshot) {
          let templates = snapshot.val();
          for(let name in templates){
            let template = templates[name];
            template.name = name;
            result[template.type] = template;
          }
          resolve(result);
        });
    });
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

getNotificationTemplate().then(templates => {
    let options = '';
    for(let type in templates){
        options += type + ' : ' + templates[type].name + '\r\n';
    }
    rl.question('Select a template:\r\n' + options, (answer) => {
        let template = templates[answer];
        if(template){
            getTokens().then(tokensAry => {
                let browserTokens = tokensAry.browser;
                let mobileTokens = tokensAry.mobile;
                let payload = {
                    title: template.title.replace('{name}', 'TeamUnion'),
                    body: template.body,
                    icon: template.icon
                }
                sendNotification(mobileTokens, payload).then((res) => {
                    console.log('Success to mobile', res);
                });
                payload['click_action'] = template['click_action'];
                sendNotification(browserTokens, payload).then((res) => {
                    console.log('Success to browser', res);
                });
            });
        }else{
            console.log('template not existing.')
        }

        rl.close();
    })
});


