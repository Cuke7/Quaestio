'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const request = require('request');

const token = 'EAAEGe5d5OcsBANx1kMdOaVLdFubOI9TSXc1puqDpCyYMaPvQrj4k61wuRBZBd7lW0iUnBQApMIFItpnG8Sc625yE6PxBm4MbLHV5Gtv13ucLnsFtq8xpxiugDymCZBsvn4BGe2YNkHObKVXEjawggI5wAWR4WdZCN8XItpNuQZDZD'

	let inport = require("./cec.js");
let cec = inport.cec;
app.set('port', (process.env.PORT || 5000));

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
		extended: false
	}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {
	res.send('Hello world, je suis un chat bot ! :)')
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
	if (req.query['hub.verify_token'] === 'myToken') {
		res.send(req.query['hub.challenge'])
	}
	res.send('Error, wrong token')
})

app.post('/webhook', (req, res) => {

	// Parse the request body from the POST
	let body = req.body;

	// Check the webhook event is from a Page subscription
	if (body.object === 'page') {

		// Iterate over each entry - there may be multiple if batched
		body.entry.forEach(function (entry) {

			// Gets the body of the webhook event
			let webhook_event = entry.messaging[0];
			console.log('RECEIVED :' + webhook_event.message);

			// Get the sender PSID
			let sender_psid = webhook_event.sender.id;
			console.log('Sender PSID: ' + sender_psid);

			// Check if the event is a message or postback and
			// pass the event to the appropriate handler function
			if (webhook_event.message) {
				if (webhook_event.message.quick_reply) {
					handleQuickReply(sender_psid, webhook_event.message.quick_reply);
				} else {
					console.log("calling handle message");
					handleMessage(sender_psid, webhook_event.message);
				}
			}
			if (webhook_event.postback) {
				handlePostback(sender_psid, webhook_event.postback);
			}

		});

		// Return a '200 OK' response to all events
		res.status(200).send('EVENT_RECEIVED');

	} else {
		// Return a '404 Not Found' if event is not from a page subscription
		res.sendStatus(404);
	}

});

//-----------------------------------------------------------------------------------------------------------
//----------------------------------------Handles quick replies----------------------------------------------
//-----------------------------------------------------------------------------------------------------------
function handleQuickReply(sender_psid, received_message) {}

//----------------------------------------------------------------------------------------------------------
// ---------------------------------------------Handles messages--------------------------------------------
//----------------------------------------------------------------------------------------------------------


function handleMessage(sender_psid, received_message) {
	if (!received_message.is_echo) {
		let message = received_message.text;
		let input = message.split(" ");

		let response = {
			attachment: {
				type: 'template',
				payload: {
					template_type: 'generic',
					elements: []
				}
			}
		};

		for (let i = 0; i < 4; i++) {
			let results = look_text(input);
			let path = results[0][i].path;
			let title = decode(path)[0];
			let subtitle = "";
			for (let j = 0; j < input.length; j++) {
				console.log(results[1][j][i]);
				console.log(results[0][i]);
			subtitle = subtitle + "\n" + "#" + input[j] + " = " + results[0][i].occ_tab[j]+"%";
			}
			response.attachment.payload.elements.push({
				"title": title,
				"subtitle": subtitle,
				"buttons": [{
						"type": "web_url",
						"url": 'https://quaestio.herokuapp.com/cec?tagId=' + path,
						"title": "CEC",
						"messenger_extensions": false,
						"webview_height_ratio": "full"
					}
				]
			});
		}
		callSendAPI(sender_psid, response);
	}
}

//----------------------------------------------------------------------------------------------------------
// ------------------------------------Handles messaging_postbacks events-----------------------------------
//----------------------------------------------------------------------------------------------------------
function handlePostback(sender_psid, received_postback) {}

function callSendAPI(sender_psid, response) {
	// Construct the message body
	let request_body = {
		"messaging_type": "RESPONSE",
		"recipient": {
			"id": sender_psid
		},
		"message": response
	}

	// Send the HTTP request to the Messenger Platform
	request({
		"uri": "https://graph.facebook.com/v2.6/me/messages",
		"qs": {
			"access_token": token
		},
		"method": "POST",
		"json": request_body
	}, (err, res, body) => {
		if (!err) {
			console.log('message sent!')
		} else {
			console.error("Unable to send message:" + err);
		}
	});
}

app.get('/cec/', function (req, res) {
	let paragraph = decode(req.query.tagId);
	let str = "";
	for (let i = 0; i < paragraph.length; i++) {
		str = str + '<p style="font-size: 40px; margin-left: 6%; margin-right: 6%;">' +
			paragraph[i] +
			'</p>'
	}
	res.send(
		'<p style="font-size: 45px; margin-left: 8%; margin-right: 8%;">' +
		str +
		'</p>');
});

// Spin up the server
app.listen(app.get('port'), function () {
	console.log('running on port', app.get('port'))
})

String.prototype.replaceAll = function (search, replacement) {
	var target = this;
	return target.replace(new RegExp(search, 'g'), replacement);
};

function look_text(data) {
	let text_results = [];
	let final_results = [];
	for (let index = 0; index < data.length; index++) {
		text_results.push([]);
		for (let p = 0; p < cec.length; p++) {
			for (let s = 2; s < cec[p].length; s++) {
				for (let c = 2; c < cec[p][s].length; c++) {
					for (let a = 2; a < cec[p][s][c].length; a++) {
						for (let pa = 2; pa < cec[p][s][c][a].length; pa++) {
							for (let i = 2; i < cec[p][s][c][a][pa].length; i++) {
								let occ = search(data[index], cec[p][s][c][a][pa][i]);
								text_results[index].push({
									'occ': occ,
									'path': p + '-' + s + '-' + c + '-' + a + '-' + pa + '-' + i
								});
							}
						}
					}
				}
			}
		}
	}

	for (let k = 0; k < text_results.length; k++) {
		format(text_results[k], data);
	}
	

	for (let i = 0; i < text_results[0].length; i++) {
		let tot = 0;
		let occ_tab=[];
		for (let j = 0; j < text_results.length; j++) {
			tot =tot + parseFloat(text_results[j][i].occ);
			occ_tab.push(parseFloat(text_results[j][i].occ)*200);
		}
		final_results.push({
			'occ_score': tot.toFixed(2),
			'path': text_results[0][i].path,
			'occ_tab': occ_tab
		})
	}

	final_results.sort(function (a, b) {
		return parseFloat(b.occ_score) - parseFloat(a.occ_score);
	});
	for (let i = 0; i < data.length; i++) {
		text_results[i].sort(function (a, b) {
			return parseFloat(b.occ) - parseFloat(a.occ);
		});
	}

	return [final_results, text_results];
}

function search(word, item) {
	let occ = 0;
	for (let i = 0; i < item.length; i++) {
		if (item[i] != undefined) {
			//occ = occ + item[i].toLowerCase().split(word.toLowerCase()).length - 1
			occ = occ + findWord(word.toLowerCase(), item[i].toLowerCase()); // A VALIDER !
		}
	}
	return occ;
}

function format(res, input) {
	let max = 0;
	for (let i = 0; i < res.length; i++) {
		if (res[i].occ > max) {
			max = res[i].occ;
		}
	}
	//console.log(max);
	for (let i = 0; i < res.length; i++) {
		res[i].occ = ((res[i].occ / max) / input.length).toFixed(2);
	}

}

function findWord(word, sentence) {
	sentence = sentence.replaceAll("\"", " ");
	let arr = sentence.split(' ');
	let count = 0;
	count = arr.filter(e => e.toLowerCase() == word.toLowerCase()).length
		return count;
}

function decode(path2) {
	let path = path2.split('-');

	return cec[path[0]][path[1]][path[2]][path[3]][path[4]][path[5]];
}

//--------------


/*function look_titles(data) {
let title_results = [];
let final_results = [];
for (let index = 0; index < data.length; index++) {
title_results.push([]);
for (let p = 0; p < cec.length; p++) {
let occ = findWord(data[index], cec[p][0]);
title_results[index].push({
'title': cec[p][0],
'occ': occ,
'path': p + '-' + "0"
});
for (let s = 2; s < cec[p].length; s++) {
let occ = findWord(data[index], cec[p][s][0]);
title_results[index].push({
'title': cec[p][s][0],
'occ': occ,
'path': p + '-' + s + '-' + "0"
});
for (let c = 2; c < cec[p][s].length; c++) {
let occ = findWord(data[index], cec[p][s][c][0]);
title_results[index].push({
'title': cec[p][s][c][0],
'occ': occ,
'path': p + '-' + s + '-' + c + '-' + c + '-' + "0"
});
for (let a = 2; a < cec[p][s][c].length; a++) {
let occ = findWord(data[index], cec[p][s][c][a][0]);
title_results[index].push({
'title': cec[p][s][c][a][0],
'occ': occ,
'path': p + '-' + s + '-' + c + '-' + a + '-' + "0"
});
for (let pa = 2; pa < cec[p][s][c][a].length; pa++) {
let occ = findWord(data[index], cec[p][s][c][a][pa][0]);
title_results[index].push({
'title': cec[p][s][c][a][pa][0],
'occ': occ,
'path': p + '-' + s + '-' + c + '-' + a + '-' + pa + '-' + "0"
});
for (let i = 2; i < cec[p][s][c][a][pa].length; i++) {
let occ = findWord(data[index], cec[p][s][c][a][pa][i][0]);
title_results[index].push({
'title': cec[p][s][c][a][pa][i][0],
'occ': occ,
'path': p + '-' + s + '-' + c + '-' + a + '-' + pa + '-' + i + '-' + "0"
});
}
}
}
}
}
}
}

for (let i = 0; i < title_results.length; i++) {
format(title_results[i]);
}

for (let i = 0; i < title_results[0].length; i++) {
let tot = 0;
for (let j = 0; j < title_results.length; j++) {
tot = tot + parseFloat(title_results[j][i].occ);
}
final_results.push({
'occ_score': tot.toFixed(2),
'path': title_results[0][i].path
})
}

final_results.sort(function (a, b) {
return parseFloat(b.occ_score) - parseFloat(a.occ_score);
});
return final_results;
}*/
