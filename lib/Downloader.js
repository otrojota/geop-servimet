const mongoDB = require("./MongoDB");
const moment = require("moment-timezone");
const config = require("./Config").getConfig();
const request = require("request");

class Downloader {
    constructor() {        
    }
    static get instance() {
        if (!Downloader.singleton) Downloader.singleton = new Downloader();
        return Downloader.singleton;
    }

    init() {
        this.callDownload(1000);
    }
    callDownload(ms) {
        if (!ms) ms = 60000;
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(_ => {
            this.timer = null;
            this.download()
        }, ms);
    }

    async download() {
        try {
            if (!mongoDB.connected) {
                console.error("[Downloader] MongoDB desconectado. Se aborta descarga.");
                return;
            }
            let promises = [];
            config.estaciones.forEach(e => {
                promises.push(this.downloadEstacion(e));
            });
            await Promise.all(promises);
        } catch(error) {
            console.error("Error en Downloader", error);
        } finally {
            this.callDownload();
        }
    }

    downloadEstacion(e) {
        return new Promise(resolve => {
            request(e.url, (err, res, body) => {
                if (err) {
                    console.error("Error en request de estacion '" + e.codigo + "'", err);
                    resolve();
                    return;
                } else if (res && res.statusCode != 200) {
                    console.error("Error en response de estacion '" + e.codigo + "' [" + res.statusCode + "]:" + res.statusText, err);
                    resolve();
                    return;
                }
                try {
                    //console.log("body", body);
                    let fields = body.split(" ");
                    let time = moment.tz(fields[0] + " " + fields[1], "DD-MM-YY HH:mm:ss", config.timeZone);
                    //console.log("time", time.format());
                    let doc = {_id:time.valueOf()};
                    e.variables.forEach(variable => {
                        if ((variable.indice - 1) < fields.length) {
                            let v = parseFloat(fields[variable.indice - 1]);
                            if (!isNaN(v)) doc[variable.codigo] = v;
                        }
                    });
                    //console.log(e.codigo, doc);
                    mongoDB.collection(e.codigo)
                        .then(col => {
                            col.updateOne({_id:doc._id}, {$set:doc}, {upsert:true}, err => {
                                if (err) console.error("Error en upsert de estacion '" + e.codigo + "'", err);
                                resolve();
                            });
                        })
                        .catch(err => {
                            console.error("Error obteniendo coleccion de estacion '" + e.codigo + "'", err);
                            resolve();
                        });
                } catch(error) {
                    console.error("Error descargando estacion '" + e.codigo + "'", error);
                    resolve();
                }
            });
        });  
    }
}

module.exports = Downloader.instance;