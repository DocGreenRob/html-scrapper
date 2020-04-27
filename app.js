const express = require('express');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
var bodyParser = require('body-parser')
const port = 3000;
var cors = require('cors');
var app = express();
//use json parser
var jsonParser = bodyParser.json();
app.use(cors());
app.post('/images', jsonParser, function(req, res) {
    console.log(req.body);
    let url = req.body.url;
    fetch(url)
        .then(res => res.text())
        .then(async body => {

            var $ = cheerio.load(body);
            //title of the page
            var title = $("title").text();
            title = title.toLocaleLowerCase();
            if (title == 'robot check') {
                await fetch(url)
                    .then(res => res.text())
                    .then(body => {
                        console.log('reloaded again');
                        $ = cheerio.load(body);
                        title = $("title").text().toLocaleLowerCase();
                    });
            }
            //images present in the html page
            var imageUrls = [];

            $('img').each(function(i, element) {
                var a = $(this);

                console.log(title);
                var image = a.attr('src');
                //avoid data image urls because of the size---avaerage size of image url is 150
                if (image != undefined && image.length < 150) {
                    let filtergGif = image.endsWith('gif');
                    let filterSvg = image.endsWith('svg');
                    console.log(filtergGif, image);
                    console.log(filterSvg, image);
                    //filter svg and gif which are mostly icons or loaders
                    if (!filterSvg && !filtergGif) {
                        imageUrls.push(image);
                    }

                }

            });
            //additional filters for specific domains

            if (title.includes('amazon')) {
                imageUrls = imageUrls.map(x => {

                    if (x.includes('https://m.media-amazon.com/images/S/')) {
                        return x;
                    } else {
                        return null;
                    }
                })
            }



            //return object
            let returnObj = {
                title: title,
                images: imageUrls
            }

            res.send(returnObj);

        }).catch(err => {
            console.error(err);
            res.send("eor")
        });;


});

app.listen(port, () => console.log(`Scraper listening at http://localhost:${port}`))