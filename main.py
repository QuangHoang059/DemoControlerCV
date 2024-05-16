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
img_size=(224,224)
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

cors = CORS(app)


@app.route('/', methods=['POST'])
def load():

    data = request.get_json()
    image_data = np.array(data['data'], dtype=np.uint8)
    pred= LR_pipeline.predict(np.asarray([image_data]))[0]

 
    dataimage = {'key': int(pred)}

    return jsonify(dataimage)


if __name__ == "__main__":
    app.run(debug=True,port=50001)
