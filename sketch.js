//audio ml5
let audioContext;
let mic;
let pitch;
let canvas;
let currentFreq = 0;

// Update the DOM every 100 milliseconds
let lastDomUpdate = 0;
const domUpdateInterval = 100;

//spiral
let dash, traceCheckbox;
let offLength;
let gapLength = 2;
let driftTime = 1;

// Declare a "SerialPort" object - arduino
let serial;
let latestData = " ";  


function updateFrequencyDisplay(frequency) {
  let now = Date.now();
  if (now - lastDomUpdate > domUpdateInterval) {
    select("#result").html(frequency + " Hz");
    lastDomUpdate = now;
  }
}

function setup() {
  createCanvas(1000, 750);
  background(220);

  //get audio
  audioContext = getAudioContext();
  mic = new p5.AudioIn();
  mic.start(startPitch);
  textAlign(CENTER, CENTER);

  // Trace Checkbox
  traceCheckbox = createCheckbox("Trace", true);
  traceCheckbox.position(500, 750);

  
  //arduino
  serial = new p5.SerialPort();
  
  // Assuming our Arduino is connected, let's open the connection to it
  // Change this to the name of your arduino's serial port
  serial.open("/dev/tty.usbmodem101");

  // Here are the callbacks that you can register
  // When we connect to the underlying server
  serial.on('connected', serverConnected);

  // When we get a list of serial ports that are available
  serial.on('list', gotList);
 

  // When we some data from the serial port
  serial.on('data', gotData);
}

// We are connected and ready to go
function serverConnected() {
  print("Connected to Server");
}

function startPitch() {
  pitch = ml5.pitchDetection("./model/", audioContext, mic.stream, modelLoaded);
}

function modelLoaded() {
  getPitch();
}

function getPitch() {
  pitch.getPitch(function (err, frequency) {
    if (frequency) {
      currentFreq = frequency;
    }

    setTimeout(getPitch, 100);
  });
}

// Got the list of ports
function gotList(thelist) {
  print("List of Serial Ports:");
  // theList is an array of their names
  for (let i = 0; i < thelist.length; i++) {
    // Display in the console
    print(i + " " + thelist[i]);
  }
}

// There is data available to work with from the serial port
function gotData() {
  let currentString = serial.readLine();  
  // read the incoming string
  
  trim(currentString);                    
  // remove any trailing whitespace
  
  if (!currentString) return;             
  // if the string is empty, do no more
  
  console.log(currentString);             
  // print the string
  
  latestData = currentString;            
  // save it for the draw method
}

  // We got raw from the serial port
  function gotRawData(thedata) {
    print("gotRawData" + thedata);
}


function draw() {
  background(220);

  let centerX = width / 2;
  let centerY = height / 2;

  offLength = map(currentFreq, 20, 2000, 1, 20);
  let trace = traceCheckbox.checked();

  let spiralPoints = generateSpiralPoints(
    centerX,
    centerY,
    900,
    offLength,
    0.4
  );

  let dash = map(latestData, 0, 1023, 3, 50);
  for (let i = 0; i < spiralPoints.length - 1; i++) {
    drawDashedLine(
      spiralPoints[i],
      spiralPoints[i + 1],
      dash,
      gapLength,
      driftTime,
      trace
    );
  }
}

function generateSpiralPoints(
  centerX,
  centerY,
  numPoints,
  angleOffset,
  distanceOffset
) {
  let points = [];
  let angle = 0;
  let distance = 0;
  for (let i = 0; i < numPoints; i++) {
    let x = centerX + cos(angle) * distance;
    let y = centerY + sin(angle) * distance;
    points.push(createVector(x, y));
    angle += angleOffset;
    distance += distanceOffset;
  }
  return points;
}

function drawDashedLine(start, end, dash, gap, driftTime, trace) {
  let segments = [];
  let currentPoint = start.copy();
  let directionVector = p5.Vector.sub(end, start);
  let dashVector = directionVector.copy().setMag(dash);
  let gapVector = directionVector.copy().setMag(gap);

  let safetyCounter = 0; // counter to prevent infinite loops
  while (p5.Vector.dist(currentPoint, end) > dash && safetyCounter < 1000) {
    let newPoint = p5.Vector.add(currentPoint, dashVector);
    if (trace) {
      let movedSegment = {
        start: currentPoint.copy().add(p5.Vector.random2D().mult(driftTime)),
        end: newPoint.copy().add(p5.Vector.random2D().mult(driftTime)),
      };
      segments.push(movedSegment);
    } else {
      segments.push({ start: currentPoint.copy(), end: newPoint });
    }
    currentPoint.add(dashVector).add(gapVector);
    safetyCounter++;
  }

  segments.forEach((segment) => {
    line(segment.start.x, segment.start.y, segment.end.x, segment.end.y);
  });
}
