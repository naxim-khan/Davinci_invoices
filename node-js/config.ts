export default {
    aws: {
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        s3: {
            bucketName: process.env.S3_BUCKET_NAME || 'davinci-processed-flights',
        },
        sqs: {
            queueUrl: process.env.SQS_QUEUE_URL,
        }
    },
    pinot: {
        brokerUrl: process.env.PINOT_HTTP_BROKER_URL || 'http://localhost:8099',
    },
    pdf: {
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4173',
    }
};
