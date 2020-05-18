# docker build -f servimet.dockerfile -t otrojota/geoportal:servimet-0.23 .
# docker push otrojota/geoportal:servimet-0.23
#
FROM otrojota/geoportal:gdal-nodejs
WORKDIR /opt/geoportal/geop-servimet
COPY . .
RUN apt-get update
RUN apt-get -y install git
RUN npm install 
EXPOSE 8183
CMD node index.js