const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
var CryptoJS = require("crypto-js");
const SHA256 = require('crypto-js/sha256');
const request = require('request-promise');
const generator = require('./generators/generators.js')

const mongo = require('mongodb');
const MongoClient = require('mongodb').MongoClient;
const mongoClient = new MongoClient("mongodb+srv://admin:Mdb12812122424@@cluster0-o83lo.mongodb.net/test?retryWrites=true", { useNewUrlParser: true });
let dbClient;

function getRandomInt(min, max) { // функция для получения рандомного числа по заданному диапазону
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const app = express(); /* подключение модулей */

app.use(session({ // настройка сессий
  secret: 'newSecret',
  resave: false,
  saveUninitialized: false,
}));

let wordsArr = []

for (let i = 0; i < 256; i++) {
	wordsArr[i] = []
	for (let j = 0; j < 256; j++) {
		wordsArr[i][j] = generator.generateWord()
	}
}

let arrFunc = []

for (let i = 0; i < 256; i++) {
	arrFunc[i] = []
	for (let j = 0; j < 256; j++) {
		arrFunc[i][j] = generator.generateFunction()
	}
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

mongoClient.connect((err, client) => { // подключение бд и запуск сервера
  if (err) return console.log(err);
  dbClient = client;
  app.locals.usersCollection = client.db('mobileDB').collection('users');
  app.locals.resourcesCollection = client.db('mobileDB').collection('resources')
  app.locals.wordsCollection = client.db('mobileDB').collection('words')
  app.locals.funcCollection = client.db('mobileDB').collection('trigf')
  app.listen(process.env.PORT || 3000, () => {
    console.log('Сервер проекта запущен');
  });
});

function createCode(login,password) {
  const systemDate = new Date();
  const date = ''+systemDate.getFullYear()+(systemDate.getMonth()+1)+systemDate.getDate()+systemDate.getHours()+systemDate.getMinutes()+systemDate.getSeconds();
  let i = getRandomInt(0, 255);
  let j = getRandomInt(0, 255);

  const secretStr = wordsArr[i][j]; //выбор слова из массива по индексу

  const hash = SHA256(login+password+systemDate+secretStr); // разбиение на слова строки состоящей из входных данных
  hashStr = hash.toString(CryptoJS.enc.SHA256).toUpperCase();
  let values = { // формирование переменных на основании hashStr
    a: hashStr.substr(hashStr.length-2,2),
    b: hashStr.substr(hashStr.length-4,2),
    c: hashStr.substr(hashStr.length-6,2),
    x: hashStr.substr(9,2),
    y: hashStr.substr(11,2),
    p1: hashStr.substr(hashStr.length-8,2),
    p2: hashStr.substr(hashStr.length-10,2),
  }

  values = { // перевод в десятичное значение
    a: parseInt(values.a,16),
    b: parseInt(values.b,16),
    c: parseInt(values.c,16),
    x: parseInt(values.x,16),
    y: parseInt(values.y,16),
    p1: parseInt(values.p1,16),
    p2: parseInt(values.p2,16),
  }

  i = parseInt(hashStr.substr(0,2),16);
  j = parseInt(hashStr.substr(2,2),16);  // определение индекса функции

  let selectedFunction = arrFunc[i][j]; // выбор функции из массива по определенному индексу
  let f = eval(selectedFunction); // передаю в f строчную функцию в виде программного кода

  let firstBorder = selectedFunction.indexOf('(')+1; // определяю границы указания аргументов функции
  let secondBorder = selectedFunction.indexOf(')');

  let arguments = selectedFunction.substring(firstBorder,secondBorder); // получаю аргументы функции в виде строки

  let res;
  eval('const {' + arguments + '} = values;' + 'res = f('+ arguments +')');
  let tempPass; // объявление временного пароля
  if (res.toString().indexOf('.') > 0) { // проверка на целостность результата и на нужное количество цифр после запятой
    console.log(res.toString())
    let pointIndex = res.toString().indexOf('.'); // временный пароль определяется числами после запятой
    if (res.toString().substring(pointIndex+1).length < 8) {
      for(let i = 0; i < 8; i++) {
        res += "1";
      }
    } else {
      tempPass = res.toString().substr(pointIndex+1,6);
    }

    tempPass = res.toString().substr(pointIndex+5,6); // начиная с 5-й позиции, длина 6 цифр

  } else {
    tempPass = createCode(login)
  }
  return tempPass;
} // функция генерации пароля

app.post('/createCode', (req, res) => { // генерация кода
  const { login,address } = req.body;
  const options = { // настройка запроса
    method: 'POST',
    uri: address + '/checkUser',
    body: {
      login: login,
    },
    json: true,
  }

  request(options) // проверка наличия пользователя на сайте
    .then((response) => {
      if (response.userAvailable) {
        console.log('Такой чувак есть на сайте')
        let collection = app.locals.usersCollection
        collection.findOne({"resources.login": login}, (err, result) => { // поиск в собственной бд
          if (result) {
            let newCode = createCode(result.login, result.password)
            collection.updateOne({_id: new mongo.ObjectId(result._id)}, {$set: {code: newCode}})
            res.send({secretCode: newCode});
          } else {
            res.send({secretCode: null})
          }
        })
      } else {
        console.log('Такого чувака нет на сайте')
        res.send({secretCode: null});
      }
    })
    .catch((err) => {
      if (err) return console.log(err);
    })
})

app.post('/checkCodeWithData', (req, res) => {
  const { login } = req.body;
  const collection = app.locals.usersCollection;
  collection.findOne({"resources.login": login}, (err, result) => {
    if (err) return console.log(err);
    if (result.code) {
      res.send({ codeS: result.code })
    } else {
      res.send(false)
    }
  })
})

app.post('/userRegistration', (req, res) => {
  const { login,password } = req.body
  const collection = app.locals.usersCollection

  let user = {
    login: login,
    password: password
  }

  collection.findOne(user, (err, result) => {
    if (err) return console.log(err)
    console.log(result)
    if (!result) {
      collection.insertOne(user, (err, result) => {
        if (err) return console.log(err)
        res.send({success: true})
      })
    } else {
      res.send({success: false})
    }
  })
})

app.post('/userAuthorizationtion', (req, res) => {
  const { login,password } = req.body
  const collection = app.locals.usersCollection

  let user = {
    login: login,
    password: password
  }

  collection.findOne(user, (err, result) => {
    if (err) return console.log(err)
    console.log(result)
    if (result) {
      req.session.authorized = true;
      req.session.userlogin = login;
      req.session.role = 'user'
      res.send({success: true, userLogin: req.session.userlogin, userExists: req.session.authorized, role: req.session.role })
    } else {
      res.send({success: false})
    }
  })
})

app.post('/resourceRegistration', (req, res) => {
  const { login,password,resourceName,address } = req.body;
  const resource = {
    login: login,
    password: password,
    name: resourceName,
    address: address
  }

  const collection = app.locals.resourcesCollection;

  collection.findOne(resource, (err, result) => {
    if (err) return console.log(err)
    console.log(result)

    if (!result) {
      collection.insertOne(resource, (err, result) => {
        if (err) return console.log(err)
        res.send({success: true})
      })
    } else {
      res.send({success: false})
    }
  })
})

app.post('/resourceAuthorizationtion', (req, res) => {
  const { login,password } = req.body
  const resource = {
    login: login,
    password: password
  }

  const collection = app.locals.resourcesCollection;

  collection.findOne(resource, (err, result) => {
    if (err) return console.log(err)
    console.log(result)
    if (result) {
      req.session.authorized = true;
      req.session.userlogin = login;
      req.session.role = 'resource'
      res.send({success: true, userLogin: req.session.userlogin, userExists: req.session.authorized, role: req.session.role})
    } else {
      res.send({success: false})
    }
  })
})

app.post('/resConnect', (req, res) => {
  const { login,password,address,name } = req.body;

  const options = { // настройка запроса
    method: 'POST',
    uri: address + '/checkUserForConnect',
    body: {
      login: login,
      password: password,
    },
    json: true,
  }

  request(options) // проверка наличия пользователя на сайте
    .then((response) => {
      if (response.userAvailable) {
        const collection = app.locals.usersCollection
        collection.findOne({login: req.session.userlogin}, (err, result) => {
          if (err) return console.log(err);
          collection.updateOne({login: req.session.userlogin}, {$push: {resources: {name: name, address: address, login: login}}})
        })
        res.send(true)
      } else {
        res.send(false);
      }
    })
    .catch((err) => {
      if (err) return console.log(err);
    })
})

app.post('/registration', (req, res) => {
  const { login,password,address } = req.body;
  const resource = { login: login, password: password, address: address }

  const collection = app.locals.resourcesCollection;
  collection.insertOne(resource, (err, result) => { // добавление в бд
    if (err) return console.log(err);
    res.send({ registrationSuccess: true });
  });
})

app.post('/autentification', (req,res) => {
  const { login,password } = req.body;
  const user = { login: login, password: password }

  const collection = app.locals.resourcesCollection;
  collection.findOne(user, (err, result) => { // поиск в бд
    if (err) return console.log(err);
    if (result) {
      req.session.authorized = true;
      req.session.userlogin = login;
      console.log(req.session)
      res.send({ userExists: true, userLogin: req.session.userlogin });
    } else {
      res.send({ userExists: false });
    }
  })
})

app.get('/checkSession', (req, res) => { // проверка сессии
  if (req.session.authorized) {
    console.log('Сессия есть')
    res.send({ userExists: true, userLogin: req.session.userlogin, role: req.session.role });
  } else {
    res.send({ userExists: false });
    console.log('Сессии нет')
  }

  // const collection = app.locals.wordsCollection
  // for (let i = 0; i < 256; i++) {
  //   for (let j = 0; j < 256; j++) {
  //     collection.insertOne({col: i, row: j, func: wordsArr[i][j]}, (err, result) => {
  //       if (err) return console.log(err);
  //       console.log(`col: ${i}, row: ${j}`)
  //     })
  //   }
  // }
});

app.get('/getResources', (req, res) => {
  const collection = app.locals.resourcesCollection;
  collection.find({}, {login: false, password: false}).toArray((err, result) => {
    if (err) return console.log(err);
    console.log(result)
    res.send({ resourcesList: result})
  })
})

app.get('/getMyResources', (req, res) => {
  const collection = app.locals.usersCollection
  collection.find({login: req.session.userlogin}).toArray((err, result) => {
    if (err) return console.log(err);
    let resourcesList = []
    console.log(result)
    if (result) {
      result.forEach(item => {
        item.resources.forEach(resurs => {
          resourcesList.push(resurs)
        })
      })
      res.send({resources: resourcesList})
    } else {
      res.send({resources: null})
    }
  })
})

app.get('/getResInfo', (req, res) => {
  const collection = app.locals.resourcesCollection
  collection.findOne({login: req.session.userlogin}, (err, result) => {
    if (err) return console.log(err);
    console.log(result)
    res.send({ resourceName: result.name, address: result.address })
  })
})

app.post('/editResInfo', (req, res) => {
  const { name,address } = req.body;
  const collection = app.locals.resourcesCollection
  collection.update({login: req.session.userlogin}, {$set: {name: name, address: address}})
  res.send(true)
})

app.get('/deleteCode', (req, res) => {
  if (req.session.authorized && req.session.userlogin) {
    const collection = app.locals.usersCollection
    collection.updateOne({login: req.session.userlogin}, {$set: {code: ''}})
    res.send(true)
  } else {
    res.send(false)
  }
})

app.get('/logout', (req, res) => {
  if (req.session.authorized && req.session.userlogin) {
    delete req.session.userlogin
    delete req.session.authorized
    delete req.session.role
    res.send({success: true})
  } else {
    res.send({success: false})
  }
})

process.on("SIGINT", () => {
  dbClient.close();
  process.exit();
});
