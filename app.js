const express = require('express');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const { Curl } = require('node-libcurl');
const port = 3000;
var bodyParser = require('body-parser');
var cors = require('cors');
var app = express();
//use json parser
var jsonParser = bodyParser.json();


app.use(cors());
app.post('/images', jsonParser, async function(req, res) {


    let url = req.body.url;

    //amazon doesnt allow curl requests returns robot check everytime

    if (url.includes('amazon.com')) {

        await fetchHtml(url).then(x => {
            let returnObj = loadBodyAndFilter(x, url);
            res.send(returnObj);
        });


    } else {

        //Use Curl to get the HTML

        const curl = new Curl();
        $agent = 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.0.3705; .NET CLR 1.1.4322)';
        curl.setOpt('URL', url);
        curl.setOpt("SSL_VERIFYPEER", false);
        curl.setOpt("VERBOSE", true);
        curl.setOpt('FOLLOWLOCATION', true);
        curl.setOpt("USERAGENT", $agent)
        let hasTriggered = false;

        //on finish curl request
        curl.on('end', function(statusCode, data) {
            console.info(statusCode);
            this.close();
            let returnObj = loadBodyAndFilter(data, url)
            res.send(returnObj);

        });

        //when an error occurs
        curl.on('error', function(error) {
            console.info(error);
            if (hasTriggered == false) {
                curl.close.bind(curl);
            }
            return res.send('error');

        });

        //start curl opeeration
        curl.perform();

    }


});

//fetch html function

var fetchHtml = async(url) => {

    return fetch(url)
        .then(res => res.text())
        .then(res => {
            return res;
        })
}

//load data and filter 

var loadBodyAndFilter = (data, url) => {
    let dateTime = new Date();

    console.log('make http req', dateTime.getMilliseconds());
    var $ = cheerio.load(data);
    //title of the page
    var title = $("title").text();
    title = title.toLocaleLowerCase();
    title = title.toString().replace('\t', '');
    title = title.toString().replace('\n', '');
    if (title === 'robot check') {
        fetch(url)
            .then(async res => res.text())
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
        console.log(image)
        if (image != undefined) {

            if (!image.startsWith('//') && !image.startsWith('h')) {

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
            if (!x.includes('Assets') && !x.includes('media/icons')) {
                imageUrls.push(x);
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

    //POSTFLOR
    if (url.includes('postflor.com') || url.includes('flor.com')) {
        let images = imageUrls;
        imageUrls = [];
        $('.image').each(function(k, element) {
            var florImage = $(this);

            imageUrls.push(florImage.attr('data-thumb'))
        });
        console.log('data thumb')
        if (imageUrls.length == 0) {
            imageUrls = images.map(x => {
                return x;
            });
        }
    }

    //ashley furnitures
    if (url.includes('ashleyfurniture.com')) {
        let images = imageUrls;
        imageUrls = [];

        images.map(x => {
            if (!x.includes('static')) {
                imageUrls.push(x);
            }
        });
    }

    //william sonoma

    if (url.includes('williams-sonoma.com')) {
        console.log($('#pipHeroAnchor').html());
        $('#pipHeroAnchor').each((k, element) => {
            var florImage = $(this);
            console.log(florImage.attr('data-overlaydata'));
        })

    }

    //Montana Supply Corporation
    if (url.includes('mountainsupply.com')) {
        let images = imageUrls;
        imageUrls = [];
        images.map(x => {
            if (x.includes('categories')) {
                imageUrls.push(x);
            }
        });
    }

    //carpet one filter
    if (url.includes('conlins.com')) {
        let images = imageUrls;
        imageUrls = [];
        images.map(x => {
            if (!x.includes('../..')) {
                imageUrls.push(x);
            }
        });
        if (imageUrls.length == 0) {
            imageUrls = images.map(x => {
                return x;
            });
        }
    }

    let returnObj = {
        title: title,
        images: imageUrls
    };

    return returnObj;

}

app.listen(port, () => console.log(`Scraper listening at http://localhost:${port}`))