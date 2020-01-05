const easyvk = require('easyvk');
const moment = require('moment');
const readline = require('readline');

const { updateDelay, messagesList } = require('./src/config');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function declantion(number, titles) {  
    cases = [2, 0, 1, 1, 1, 2];  
    return titles[ (number % 100 > 4 && number % 100 < 20)? 2 : cases[(number % 10 < 5) ? number % 10 : 5] ];  
}

function randomInteger(min, max) {
    let rand = min - 0.5 + Math.random() * (max - min + 1);
    return Math.round(rand);
}

let isStarted = false;
let captchaRequired = false;
let usersList = [];

moment.locale('ru');

async function main(vk) {
    vk.call('friends.get', {
        order: 'name',
        fields: 'can_write_private_message'
    }).then(({ vkr }) => {
        for (let i = 0; i < vkr.items.length; i++) {
            const friend = vkr.items[i];
            
            if (friend.can_write_private_message)
                usersList.push(friend.id);
        }

        setInterval(async () => {
            if (!isStarted && moment().format('DD') == '01') {
                isStarted = true;
                let successCount = 0;
    
                for (let i = 0; i < usersList.length; i++) {
                    while (captchaRequired);

                    const user = usersList[i];

                    await vk.call('messages.setActivity', {
                        user_id: user,
                        type: 'typing'
                    });

                    await setTimeout(async () => {
                        await vk.call('messages.send', {
                            user_id: user,
                            random_id: 0,
                            message: messagesList[randomInteger(1, messagesList.length) - 1]
                        }).then(() => {
                            console.log(`Пользователь успешно поздравлен`);
                            successCount++;
                        }).catch(err => {
                            console.log(`Ошибка: пользователь не был поздравлен`);
                        }).finally(() => {
                            if (i + 1 == usersList.length) {
                                console.log();
        
                                let result = `Операция выполнена успешно. ${successCount} ${declantion(successCount, [ 'друг', 'друга', 'друзей' ])} из ${usersList.length} поздравленно`;
                                console.log(result);
        
                                vk.call('messages.send', {
                                    user_id: vk.session.user_id,
                                    random_id: 0,
                                    message: result
                                });
                            }
                        });
                    }, 5000);
                }
            }
        }, updateDelay);
    });
}

function captchaHandler ({ captcha_sid, captcha_img: url, resolve: solve }) {
    captchaRequired = true;

    console.log();
    console.log(`Ой.. Надо решить капчу, URL = ${url}`);

    rl.question('Введите каптчу: ', captcha => {
        solve(captcha).then(() => {
            console.log('Капча решена');
            captchaRequired = false;
        }).catch(({ err, reCall }) => {
            console.log('Каптча не решена. Попробуйте ещё раз');

            reCall();
        });

        rl.close();
    });
}
  
async function logInWith2Auth(params) {
    return new Promise(_2faNeed => {
        function relogIn(_2faCode = '') {
            if (_2faCode) params.code = _2faCode;
  
            easyvk(params).then(main).catch(err => {
                if (!err.easyvk_error && err.error_code == 'need_validation') {
                    _2faNeed({
                        err: err,
                        relogIn
                    });
                }
            });
        }

        relogIn();
    });
}

logInWith2Auth({
    username: '',
    password: '',
    reauth: true,
    captchaHandler
}).then(({ relogIn }) => {
    rl.question('Введите код двухфакторной аутентификации: ', answer => {
        relogIn(answer);
        rl.close();
    });
});