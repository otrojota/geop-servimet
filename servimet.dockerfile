FROM otrojota/geoportal:gdal-nodejs
WORKDIR /opt/geoportal/geop-servimet
COPY . .
RUN npm install 
EXPOSE 8183
CMD node index.js