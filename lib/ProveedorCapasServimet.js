const {ProveedorCapas, CapaObjetosConDatos} = require("geop-base-proveedor-capas");
const config = require("./Config").getConfig();
const mongoDB = require("./MongoDB");

class ProveedorCapasServimet extends ProveedorCapas {
    constructor(opciones) {
        super("servimet", opciones);
        this.addOrigen("servimet", "SERVIMET", "http://meteoarmada.directemar.cl/prontus_meteo/site/edic/base/port/inicio.html", "./img/armada-chile.png");
        let capaEstacionesServimet = new CapaObjetosConDatos("servimet", "ESTACIONES_SERVIMET", "Estaciones SERVIMET", "servimet", {
            temporal:false,
            datosDinamicos:false,
            menuEstaciones:true
        }, ["cl-estaciones"], "img/armada-chile.png");
        config.estaciones.forEach(e => {
            let vars = [];
            e.variables.forEach(v => {
                vars.push({
                    codigo:v.codigo, 
                    nombre:v.nombre,
                    formatos:["serieTiempo", "valorEnPunto"],
                    icono:v.icono,
                    temporal:true, 
                    unidad:v.opciones.unidad,
                    decimales:v.opciones.decimales
                })
            });
            let extraConfig = {
                configAnalisis:{analizador:"serie-tiempo", analizadores:{
                    "serie-tiempo":{
                        variable:"servimet.ESTACIONES_SERVIMET." + e.codigo + ".TEMP", nivelVariable:0,
                        tiempo:{tipo:"relativo", from:-2, to:4}
                    }
                }}
            }
            capaEstacionesServimet.agregaPunto(e.codigo, e.nombre, e.lat, e.lng, "img/estacion-servimet.png", vars, extraConfig);
        });
        this.addCapa(capaEstacionesServimet);
    }

    async resuelveConsulta(formato, args) {
        try {
            if (formato == "serieTiempo") {
                return await this.generaSerieTiempo(args);
            } else if (formato == "valorEnPunto") {
                return await this.generaValorEnPunto(args);
            } else throw "Formato " + formato + " no soportado";
        } catch(error) {
            throw error;
        }
    }

    async generaSerieTiempo(args) {
        try {
            let cod = args.codigoVariable;
            let p = cod.indexOf(".");
            if (p <= 0) throw "codigoVariable inválido '" + cod + "'. Se esperaba 'codigoCapa.codigoObjeto.codigoVariable";
            let codigoCapa = cod.substr(0, p);
            if (codigoCapa == "ESTACIONES_SERVIMET") {
                return this.generaSerieTiempoEstacionesServimet(args, cod.substr(p+1));
            } else throw "Código de Capa '" + codigoCapa + "' no manejado";
            
        } catch(error) {
            throw error;
        }
    }
    async generaSerieTiempoEstacionesServimet(args, cod) {
        try {
            let p = cod.indexOf(".");
            if (p < 0) throw "Código de variable inválido '" + args.codigoVariable + "'. Se esperaba codigo-capa.codigo-objeto.codigo-variable";
            let codigoEstacion = cod.substr(0, p);
            let codigoVariable = cod.substr(p+1);
            let estacion = config.estaciones.find(e => e.codigo == codigoEstacion);
            if (!estacion) throw "No se encontró la estación '" + codigoEstacion + "'";
            let variable = estacion.variables.find(v => v.codigo == codigoVariable);
            if (!variable) throw "No se encontró el datasource '" + codigoDS + "' en la estación '" + codigoEstacion + "'";
            let t0 = args.time0;
            let t1 = args.time1;
            let col = await mongoDB.collection(codigoEstacion);
            let rows = await col.find({$and:[{_id:{$gte:t0}}, {_id:{$lte:t1}}]}).sort({_id:1}).toArray();
            if (!rows.length) throw "No hay Datos para el Período";
            let ret = {
                lat:args.lat, lng:args.lng, unit:variable.opciones.unidad,
                time0:rows[0]._id, time1:rows[rows.length - 1]._id, levelIndex:args.levelIndex,
                data:rows.map(r => ({
                    time:r._id, value:r[codigoVariable], metadata:{}
                }))
            }
            return ret;
        } catch(error) {
            throw error;
        }
    }

    async generaValorEnPunto(args) {
        try {
            let cod = args.codigoVariable;
            let p = cod.indexOf(".");
            if (p <= 0) throw "codigoVariable inválido '" + cod + "'. Se esperaba 'codigoCapa.codigoObjeto.codigoVariable";
            let codigoCapa = cod.substr(0, p);
            if (codigoCapa == "ESTACIONES_SERVIMET") {
                return this.generaValorEnPuntoEstacionesServimet(args, cod.substr(p+1));
            } else throw "Código de Capa '" + codigoCapa + "' no manejado";
            
        } catch(error) {
            throw error;
        }
    }
    async generaValorEnPuntoEstacionesServimet(args, cod) {
        try {
            let p = cod.indexOf(".");
            if (p < 0) throw "Código de variable inválido '" + args.codigoVariable + "'. Se esperaba codigo-capa.codigo-objeto.codigo-variable";
            let codigoEstacion = cod.substr(0, p);
            let codigoVariable = cod.substr(p+1);
            let estacion = config.estaciones.find(e => e.codigo == codigoEstacion);
            if (!estacion) throw "No se encontró la estación '" + codigoEstacion + "'";
            let variable = estacion.variables.find(v => v.codigo == codigoVariable);
            if (!variable) throw "No se encontró el datasource '" + codigoDS + "' en la estación '" + codigoEstacion + "'";
            let t0 = args.time - 3 * 60 * 60 * 1000;
            let t1 = args.time + 3 * 60 * 60 * 1000;
            let col = await mongoDB.collection(codigoEstacion);
            let rows = await col.find({$and:[{_id:{$gte:t0}}, {_id:{$lte:t1}}]}).toArray();
            let idx=-1, delta = undefined, value = undefined, time = undefined;
            rows.forEach((r, i) => {
                let d = Math.abs(r._id - args.time);
                if (r[codigoVariable] !== undefined) {
                    if (idx < 0 || d < delta) {
                        idx = i; delta = d; value = r[codigoVariable], time = r._id;
                    }
                }
            })
            let ret = {
                lat:args.lat, lng:args.lng, unit:variable.opciones.unidad,
                time:time, levelIndex:args.levelIndex, value:value
            }
            return ret;
        } catch(error) {
            throw error;
        }
    }
}

module.exports = ProveedorCapasServimet;