const canvas = require("canvas");
const faceapi = require("face-api.js");
const express = require("express");
const path = require("path");
const fs = require("fs");
const { Canvas, Image, ImageData } = canvas;
const app = express();
var multer  = require('multer')
var upload = multer()

faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

app.use("/models", express.static("weights"));
app.use("/images", express.static("images"));
app.use(express.static("public"));


const classes = [
  "amy",
  "bernadette",
  "howard",
  "leonard",
  "penny",
  "raj",
  "sheldon",
  "stuart"
];

const faceDetectorOptions = new faceapi.SsdMobilenetv1Options(0.5);
let faceMatcher = null;

async function saveFile(fileName, buf) {
  const baseDir = path.join(__dirname, "out");
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir);
  }

  await fs.writeFileSync(path.resolve(baseDir, fileName), buf);
}

async function createBbtFaceMatcher(numImagesForTraining = 1) {
  const maxAvailableImagesPerClass = 5;
  numImagesForTraining = Math.min(
    numImagesForTraining,
    maxAvailableImagesPerClass
  );
  const labeledFaceDescriptors = await Promise.all(
    classes.map(async className => {
      const descriptors = [];
      for (let i = 1; i < numImagesForTraining + 1; i++) {
        const img = await canvas.loadImage(
          "images/" + className + "/" + className + i + ".png"
        );
        descriptors.push(await faceapi.computeFaceDescriptor(img));
      }

      return new faceapi.LabeledFaceDescriptors(className, descriptors);
    })
  );

  return new faceapi.FaceMatcher(labeledFaceDescriptors);
}

async function run(file,res,req) {
  let inputImage = await canvas.loadImage(file.buffer);
  const results = await faceapi
    .detectAllFaces(inputImage, faceDetectorOptions)
    .withFaceLandmarks()
    .withFaceDescriptors();

  const queryDrawBoxes = results.map(res => {
    const bestMatch = faceMatcher.findBestMatch(res.descriptor);
    return new faceapi.draw.DrawBox(res.detection.box, {
      label: bestMatch.toString()
    });
  });

  const outQuery = faceapi.createCanvasFromMedia(inputImage);
  queryDrawBoxes.forEach(drawBox => drawBox.draw(outQuery));
  await saveFile(file.originalname, outQuery.toBuffer("image/jpeg"));
//  res.status(200).sendFile(path.join(path.join(__dirname,'out'),req.file.originalname));
    var bitmap = fs.readFileSync(path.join(path.join(__dirname,'out'),req.file.originalname));
    // convert binary data to base64 encoded string
    let string =  new Buffer(bitmap).toString('base64');
    res.status(200).send(string)

}

async function load() {
  await faceapi.nets.ssdMobilenetv1.loadFromDisk("./weights");
  await faceapi.nets.faceLandmark68Net.loadFromDisk("./weights");
  await faceapi.nets.faceRecognitionNet.loadFromDisk("./weights");
  faceMatcher = await createBbtFaceMatcher(1);
  app.listen(3000, () => console.log("server up and running on port 3000"));
}

load();


app.get('/',(req,res)=>{
 // run();
  //res.status(200).sendFile(path.join(path.join(__dirname,'out'),'out.jpg'));
  res.status(200).sendFile(path.join(__dirname,'index.html'));
});

app.post('/process', upload.single('avatar'), function (req, res, next) {
  // req.file is the `avatar` file
  // req.body will hold the text fields, if there were any
  run(req.file,res,req)

});