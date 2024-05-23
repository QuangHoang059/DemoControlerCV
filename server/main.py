import base64
import os
import math
import random
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.pipeline import Pipeline
from keras.applications.vgg16 import VGG16
from keras.models import Sequential
from keras.layers import (
    Flatten
)
import joblib
from flask_socketio import SocketIO, emit
from cvzone.HandTrackingModule import HandDetector

img_size=(224,224)
offset = 10
def detectHand(img):
    hand, img = detector.findHands(img, draw=False)
    if hand:
        hand = hand[0]
        x, y, w, h = hand['bbox']
        padding = abs(h - w) / 2
        x_start = x - math.ceil(padding) - offset
        x_end = x + w + math.floor(padding) + offset
        y_start = y - offset
        y_end = y + h + offset
        if h > w:
            imgCrop = img[y_start:y_end, x_start:x_end]
        else:
            imgCrop = img[x_start:x_end, y_start:y_end]
        if imgCrop is not None and imgCrop.shape[0] * imgCrop.shape[1] != 0:
            imgCrop = cv2.resize(imgCrop, img_size)
        return [imgCrop, True]
    return [img, False]
    
class VGGFeatureExtractor(BaseEstimator, TransformerMixin):
    def __init__(self):
        IMG_SHAPE = (img_size[0], img_size[1], 3)
        vgg16_weight_path = 'vgg16_weights_tf_dim_ordering_tf_kernels_notop.h5'
        vgg16_model = VGG16(
            weights=vgg16_weight_path,
            include_top=False, 
            input_shape=IMG_SHAPE
        )
        self.vgg_feature_extractor = Sequential()
        self.vgg_feature_extractor.add(vgg16_model)
        self.vgg_feature_extractor.add(Flatten())
        self.vgg_feature_extractor.layers[0].trainable = False
    def fit(self, X, y=None):
        return self
    
    def transform(self, X):
        features=self.vgg_feature_extractor.predict(X)
        return np.array(features)
LR_pipeline = Pipeline([
    ('vgg', VGGFeatureExtractor()),
    ('LR', joblib.load('LR_weight.pkl'))
])

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route('/', methods=['POST'])
def load():

    data = request.get_json()
    image_data = np.array(data['data'], dtype=np.uint8)
    image_data=cv2.flip(image_data, 1)
    pred= LR_pipeline.predict(np.asarray([image_data]))[0]

 
    dataimage = {'key': int(pred)}
    
    return jsonify(dataimage)

detector = HandDetector(maxHands=1)
@socketio.on('image')
def handle_message(data):
    image_data = np.array(data['data'], dtype=np.uint8)
    # image_data = cv2.flip(image_data, 1)
    image, exist = detectHand(image_data)
    if exist:
        # cv2.imwrite('name.png', img)
        pred = LR_pipeline.predict(np.asarray([image]))[0]
    else:
        pred = 3
    # Convert the image to bytes
    _, img_encoded = cv2.imencode('.png', image)
    # Convert the bytes to a base64 string
    img_base64 = base64.b64encode(img_encoded).decode('utf-8')
    res = {'key': int(pred), 'img': img_base64}
    emit('response', res)
    
if __name__ == "__main__":
    socketio.run(app, debug=True, port=50001)
