const express = require('express');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const port = 3000;
const psl = require('psl');
var bodyParser = require('body-parser')
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
            let dateTime = new Date();

            console.log('make http req', dateTime.getMilliseconds());
            var $ = cheerio.load(body);
            //title of the page
            var title = $("title").text();
            title = title.toLocaleLowerCase();
            title = title.toString().replace('\t', '');
            title = title.toString().replace('\n', '');
            if (title === 'robot check') {
                await fetch(url)
                    .then(res => res.text())
                    .then(body => {
                        console.log('reloaded again');
                        $ = cheerio.load(body);
                        // TODO: Understand impact... and holes... possible infinite loop? ... RAG...4.27.20
                        title = $("title").text().toLocaleLowerCase();
                    });
            }

            //images present in the html page
            var imageUrls = [];
            dateTime = new Date();
            console.log('parse results', dateTime.getMilliseconds());

            $('img').each(function(i, element) {
                var a = $(this);

                var image = a.attr('src');
                if (image == undefined) {
                    image = a.attr('data-src');
                }
                if (image.startsWith('/') || !image.startsWith('h')) {

                    let url = req.body.url;
                    var extractDomain = (url) => {
                        var domain;
                        //find & remove protocol (http, ftp, etc.) and get domain
                        if (url.indexOf("://") > -1) {
                            domain = url.split('/')[2];
                        } else {
                            domain = url.split('/')[0];
                        }

                        //find & remove www
                        if (domain.indexOf("www.") > -1) {
                            domain = domain.split('www.')[1];
                        }

                        domain = domain.split(':')[0]; //find & remove port number
                        domain = domain.split('?')[0]; //find & remove url params

                        return domain;
                    }
                    image = "https://" + extractDomain(url) + "/" + image;

                }

                console.log(image);
                //avoid data image urls because of the size---avaerage size of image url is 150
                if (image != undefined && image.length < 150 && !image.startsWith('data:image') && !image.includes('logo')) {
                    let filtergGif = image.endsWith('gif');
                    let filterSvg = image.endsWith('svg');
                    // console.log(filtergGif, image);
                    // console.log(filterSvg, image);
                    //filter svg and gif which are mostly icons or loaders
                    if (!filterSvg && !filtergGif) {
                        // add unique images only
                        if (imageUrls.indexOf(image) === -1 &&
                            image.length > 0
                        ) {
                            if (image[0] === '/' && image[1] === '/') {
                                image = `https:${image}`;
                            }
                            imageUrls.push(image);
                        }
                    }
                }
            });


            //additional filters for specific domains
            //amazon filter
            if (url.includes('amazon.com')) {
                let images = imageUrls;
                imageUrls = [];
                images.map(x => {

                    if (x.includes('https://m.media-amazon.com/images/S/')) {
                        imageUrls.push(x);
                    }
                });

                console.log(images);
                if (imageUrls.length == 0) {
                    imageUrls = images;
                }
            }

            //gap filter
            if (url.includes('gap.com')) {
                let images = imageUrls;
                imageUrls = [];
                images.map(x => {
                    if (x.includes('webcontent')) {
                        imageUrls.push("https://www.gap.com/" + x)
                    }

                })
                if (imageUrls.length == 0) {
                    imageUrls = images.map(x => {
                        return "https://www.gap.com/" + x;
                    });
                }
            }

            //kohls filter
            if (url.includes('kohls.com')) {
                let images = imageUrls;
                imageUrls = [];
                images.map(x => {
                    if (!x.startsWith('/')) {
                        imageUrls.push(x);
                    }
                })
            }

            //arizona tiles
            if (url.includes('arizonatile.com')) {
                let images = imageUrls;
                imageUrls = [];
                images.map(x => {
                    if (x.startsWith('/') && !x.includes('Assets') && !x.includes('media/icons')) {
                        imageUrls.push('https://www.arizonatile.com/' + x);
                    }
                })
            }

            //lumber liquitdators

            if (url.includes('lumberliquidators.com')) {
                let images = imageUrls;
                imageUrls = [];
                images.map(x => {
                    if (!x.startsWith('/')) {
                        imageUrls.push(x);
                    }
                })
            }

            //tile bar filter
            if (url.includes('tilebar.com')) {
                let images = imageUrls;
                imageUrls = [];
                images.map(x => {
                    if (x.includes('product')) {
                        imageUrls.push(x);
                    }
                });
                if (imageUrls.length == 0) {
                    imageUrls = images.map(x => {
                        return x;
                    });
                }
            }





            //return object
            let returnObj = {
                title: title,
                images: imageUrls
            }

            res.send(returnObj);

        }).catch(err => {
            console.error(err);
            res.send("eor");
        });
});

app.listen(port, () => console.log(`Scraper listening at http://localhost:${port}`))