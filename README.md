roentgen
========

```javascript

var validator = roentgen({
    type: 'array',
    item: {
        type: 'object',
        properties: {
            when: {
                type: 'timestamp',
                toDate: true
            },
            title: {
                type: 'string',
                length: [0, 10]
            },
            howMuch: {
                type: 'number'
            }
        }
    },
    length: [1, 10] 
});

var validation = validator.run([{when: 1389534416156, title: 'something', howMuch: 10}]);

if (validation.error) {
    console.info('validation failed', validation);
}
else {
    console.info('validation successed', validation);
}
```
