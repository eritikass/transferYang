(function () {

    /**
     * amazon affiliated id
     *
     * @type {string}
     */
    var AMAZON_AFFILIATE_ID = 'rauast-20';

    /**
     * show transferwise block
     *
     * @type {boolean}
     */
    var SHOW_LOGO1 = false;

    /**
     * show banks block
     *
     * @type {boolean}
     */
    var SHOW_BANKS = false;

    /**
     * transferwise or fixer.io
     *
     * @type {string}
     */
    var CURRENCY_FEED = 'fixer.io';

    /**
     * fetch amazon data in background
     *
     * @type {boolean}
     */
    var AMAZON_BG_FETCH = true;

    /**
     * list of known amazon sites
     *
     * @type {{}}
     */
    var amazonas_hosts = {
        "www.amazon.com": "us",
        "www.amazon.co.uk": "uk",
        "www.amazon.de": "ge",
//    "www.amazon.co.jp": "japan",
        "www.amazon.ca": "ca",
        "www.amazon.es": "es",
        "www.amazon.fr": "fr",
        "www.amazon.it": "it"
    };

    /**
     * list of known prices
     *
     * @type {{}}
     */
    var knownPrices = {};

    /**
     * list of exhange rates
     *
     * @type {{}}
     */
    var rates = {};

    /**
     * amazon product id
     *
     * @type {string}
     */
    var ASIN;

    /**
     *
     * @type {jQuery}
     */
    var $ = window.jQuery;

    /**
     * get amazon url
     *
     * @param {string} host
     * @param {boolean} addaff
     * @returns {string}
     */
    function getAmazonUrl(host, addaff) {
        return "https://" + host + "/dp/" + ASIN + "/" + (addaff ? "?tag=" + AMAZON_AFFILIATE_ID : "");
    }

    /**
     * get price amazon price from body
     *
     * @param $body
     * @returns {string}
     */
    function getPriceTxtFromBody($body) {
        return $.trim($body.find('#priceblock_ourprice').text());
    }

    /**
     * get price string to number
     *
     * @param {string} txtnr
     * @returns {number}
     */
    function getPriceTxt2Nr(txtnr) {
        if (typeof txtnr == 'string') {
            txtnr = txtnr.replace(',', '.').replace(/ /, '');
            var parts = txtnr.split('.');
            if (parts.length > 2) {
                var last = parts.pop();
                txtnr = parts.join('') + '.' + last;
            }
        }
        return parseFloat(txtnr);
    }

    /**
     * set tip for what is fetched atm
     *
     * @param {string} tip
     */
    function setFetchTip(tip) {
        if (tip.length > 36) {
            tip = tip.substr(0, 34) + '...';
        }
        $('#pricechecked_amazon_fetchtip b').html(tip);
    }

    /**
     * fetch exchange rates
     *
     * @param {function} callback
     */
    function getRates(callback) {

        if (CURRENCY_FEED == 'fixer.io') {
            $.getJSON('//api.fixer.io/latest', function (data) {
                if (!data || !data.rates || data.base != 'EUR') {
                    return callback();
                }
                $.each(data.rates, function (cur, rate) {
                    cur = cur.toUpperCase();
                    rates[[cur, 'EUR'].join('-')] = {
                        source: cur,
                        target: 'EUR',
                        rate: 1 / rate
                    }
                });
                callback();
            });
            return;
        }

        // original code used during transferwise hackathon
        // that is using transferwise api
        var url = "https://test-restgw.transferwise.com/v1/rates?target=EUR";
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                var ratesRaw = JSON.parse(xhr.responseText);

                $.each(ratesRaw, function (i, rate) {
                    rates[[rate.source, rate.target].join('-')] = rate;
                });

                if (typeof callback == 'function') {
                    callback();
                }
            }
        }
        xhr.send();
    }

    /**
     * add price to Amazon site
     *
     * @param {string} host
     * @param {string} price
     */
    function addKnownPrice(host, price) {
        if (!price) {
            return;
        }
        var cur = '';
        var price_clean = '';
        if (price.substr(0, 4) == 'CDN$') {
            cur = 'CAD';
            price_clean = $.trim(price.substr(4));
        } else if (price.substr(0, 1) == '$') {
            cur = 'USD';
            price_clean = $.trim(price.substr(1));
        } else if (price.substr(0, 1) == '£') {
            cur = 'GBP';
            price_clean = $.trim(price.substr(1));
        } else if (price.substr(0, 1) == '￥') {
            cur = 'JPY';
            price_clean = $.trim(price.substr(1));
        } else if (price.substr(0, 3) == 'EUR') {
            cur = 'EUR';
            price_clean = $.trim(price.substr(3));
        } else {
            alert('price not handled: ' + price + ' | host: ' + host);
        }
        if (!cur || !price_clean) {
            return;
        }

        knownPrices[host] = {
            code: cur,
            price: getPriceTxt2Nr(price_clean),
            txt: price
        };
    }

    /**
     * get raw price from amazon site
     *
     * @param {string} host
     * @param {string} callback
     */
    function getPrice(host, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", getAmazonUrl(host), true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                var $body = $(jQuery.parseHTML(xhr.responseText))
                var price = getPriceTxtFromBody($body);
                addKnownPrice(host, price);
                callback(price);
            }
        }
        xhr.send();
    }

    /**
     * format number
     *
     * @param number
     * @returns {string}
     */
    function formatNumber(number) {
        return parseFloat(number || 0).toFixed(2);
    }

    /**
     * get price in EUR
     *
     * @param pricedata
     * @returns {number}
     */
    function getEurPrice(pricedata) {
        if (pricedata.code == 'EUR') {
            return pricedata.price;
        } else if (rates[pricedata.code + '-EUR']) {
            return pricedata.price * rates[pricedata.code + '-EUR'].rate;
        }
        return -1;
    }

    /**
     * show dialog with amazon price data
     */
    function showDialogWithData() {
        var $area1 = $('#pricechecked_amazon');
        $area1.html('');
        $area1.append($('<div/>').addClass('pricechecked_amazon'));
        var $area = $area1.find('.pricechecked_amazon');

        var baseprice_tmp = knownPrices[document.location.hostname];
        var baseprice_eur = getEurPrice(baseprice_tmp);

        var displayList = [];
        $.each(knownPrices, function (host, pricedata) {
            var eur = getEurPrice(pricedata);
            displayList.push($.extend(true, pricedata, {
                priceEur: eur,
                diffEur: eur - baseprice_eur,
                host: host,
                name: amazonas_hosts[host]
            }));
        });

        displayList.sort(function (a, b) {
            if (a.diffEur == b.diffEur) {
                return 0;
            }
            return a.diffEur > b.diffEur ? 1 : -1;
        });

        var htmlTb2 = '<tr>'
            + '<td class="pricechecked_amazon_rr0p">country</td>'
            + '<td class="pricechecked_amazon_rr2">foreign</td>'
            + '<td class="pricechecked_amazon_rr3">base</td>'
            + '<td class="pricechecked_amazon_rr4">save</td>'
            + '</tr>';

        var $tb2 = $('<table class="pricechecked_amazon_tb pricechecked_amazon_titles">' + htmlTb2 + '</table>');
        $area.append($tb2);

        $.each(displayList, function (index, pricedata) {
            var name = pricedata.name;
            var host = pricedata.host;
            var eur = pricedata.priceEur;
            var priceDif = pricedata.diffEur;

            var amazonHostProductUrl = getAmazonUrl(host, true);

            var htmlTb = '<tr class="pricechecked_amazon_off' + index + '">'
                + '<td class="pricechecked_amazon_rr0 pricechecked_amazon_flagcol"><img src="' + chrome.extension.getURL("images/" + name.toLocaleLowerCase() + ".png") + '" /></td>'
                + '<td class="pricechecked_amazon_rr1"><strong class="pricechecked_amazon_name">' + name + '</strong></td>'
                + '<td class="pricechecked_amazon_rr2 pricechecked_amazon_numbcol">' + ( pricedata.code != 'EUR' ? [pricedata.code, formatNumber(pricedata.price)].join(' ') : '&nbsp;') + '</td>'
                + '<td class="pricechecked_amazon_rr3 pricechecked_amazon_numbcol">EUR ' + formatNumber(eur) + '</td>'
                + '<td class="pricechecked_amazon_rr4 pricechecked_amazon_numbcol ' + (priceDif < 0 ? 'pricechecked_amazon_numbcolpos' : (priceDif > 0 ? 'pricechecked_amazon_numbcolneg' : '')) + '">' + (priceDif > 0 ? '+' : '') + formatNumber(priceDif) + '</td>'
                + '</tr>';

            var $tb = $('<table class="pricechecked_amazon_tb' + (host == document.location.hostname ? ' pricechecked_amazon_curhost' : '') + '">' + htmlTb + '</table>');
            var $link = $('<a />')
                .addClass('pricechecked_amazon_linky')
                .attr('href', amazonHostProductUrl)
                .prepend($tb);

            $area.append($link);
        });


        var height = (30 * displayList.length) + 38;

        if (SHOW_LOGO1) {
            var $ltw = $("<div />").addClass('pricechecked_amazon_logotw')
                .append($("<span />").html("best exchange rates by"))
                .append($('<a />')
                    .attr({'href': 'https://transferwise.com/', 'target': '_blank'})
                    .append($("<img />").attr('src', chrome.extension.getURL("images/transferwise.png")))
                );
            $area.append($ltw);
            height += 71;
        }


        if (SHOW_BANKS) {
            var logosRow2 = '<tr>'
                + '<td class="pricechecked_amazon_logos2l">'
                + '<a target="_blank" href="https://revolut.com/">'
                + '<img src="' + chrome.extension.getURL("images/revolut.png") + '" class="pricechecked_amazon_revolut" />'
                + '</a>'
                + '</td>'
                + '<td class="pricechecked_amazon_logos2l">'
                + '<a target="_blank" href="https://www.lhv.ee/">'
                + '<img src="' + chrome.extension.getURL("images/lhv.png") + '" class="pricechecked_amazon_LHV" />'
                + '</a>'
                + '</td>'
                + '<td class="pricechecked_amazon_logos2l">'
                + '<a target="_blank" href="https://number26.eu/">'
                + '<img src="' + chrome.extension.getURL("images/number26p.png") + '" class="pricechecked_amazon_number26" />'
                + '</a>'
                + '</td>'

//            + '<td class="pricechecked_amazon_logos2">'
//                +'<img src="' + chrome.extension.getURL("images/pocopay.png") + '" class="pricechecked_amazon_pocopay" />'
//            +'</td>'
                + '</tr>';

            var $ltr2 = $("<div />").addClass('pricechecked_amazon_logor2')
                .append($("<span />").html("fast payment via"));
            var $logosRow2 = $('<table class="pricechecked_amazon_logos2">' + logosRow2 + '</table>');
            $area.append($ltr2).append($logosRow2);
            height += 60;
        }


        var $hideshow = $("<span></span>")
            .addClass('pricechecked_amazon_showhide')
            .html('hide')
            .click(function () {
                if ($area.is(':visible')) {
                    $area.hide();
                    $hideshow.html('show');
                    $area1.css('height', '22px');
                    return;
                }
                $area.show();
                $hideshow.html('hide');
                $area1.css('height', height + 'px');
            });

        $area1
            .append($("<span></span>").addClass('pricechecked_amazon_copyr').html('© 2016 transferYang'))
            .append($hideshow)
            .css('height', height + 'px');
    }


    var canHref = $("head link[rel='canonical'][href]").attr('href');
    if (!canHref) {
        //console.log('not product page (1)');
        return;
    }
    ASIN = canHref.split('/').splice(-1)[0];
    if (!ASIN) {
        //console.log('not product page (2)');
        return;
    }

    var price = getPriceTxtFromBody($('body'));

    if (!price) {
        //console.log('not product price (3)');
        return;
    }

    $('body').append(
        $('<div></div>')
            .attr('id', 'pricechecked_amazon')
            .append($('<img />').attr('src', chrome.extension.getURL("images/loadingAnimation.gif")))
            .append($('<span></span>').attr('id', 'pricechecked_amazon_fetchtip').html('fetching: <b>...</b>'))
    );

    // list price
    addKnownPrice(document.location.hostname, price)

    var busyFetching = {};
    if (AMAZON_BG_FETCH) {
        chrome.runtime.onMessage.addListener(
            function (request) {
                if (request && request.message === "yang_done_request_amazon" && request.site && request.asin == ASIN) {
                    var name = amazonas_hosts[request.site];
                    delete busyFetching[name];
                    setFetchTip(Object.keys(busyFetching).join(', '));

                    if (request.body) {
                        var price = getPriceTxtFromBody($(jQuery.parseHTML(request.body)));
                        addKnownPrice(request.site, price);
                    }

                    if (Object.keys(busyFetching).length == 0) {
                        //showDialogWithData();
                        setFetchTip('exchange rates from ' + CURRENCY_FEED);
                        getRates(showDialogWithData);
                    }
                }
            }
        );

        $.each(amazonas_hosts, function (host, name) {
            if (document.location.hostname == host) {
                return;
            }
            busyFetching[name] = name;
            setFetchTip(Object.keys(busyFetching).join(', '));

            chrome.runtime.sendMessage({"message": "yang_request_amazon", "site": host, "asin": ASIN});
        });

    } else {
        $.each(amazonas_hosts, function (host, name) {
            if (document.location.hostname == host) {
                return;
            }
            busyFetching[name] = name;
            setFetchTip(Object.keys(busyFetching).join(', '));
            getPrice(host, function (price) {
                delete busyFetching[name];
                setFetchTip(Object.keys(busyFetching).join(', '));
                if (Object.keys(busyFetching).length == 0) {
                    //showDialogWithData();
                    setFetchTip('exchange rates from ' + CURRENCY_FEED);
                    getRates(showDialogWithData);
                }
            });
        });
    }


})(this);
