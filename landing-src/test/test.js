const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../src/server');

chai.use(chaiHttp);
const expect = chai.expect;

var profiles

describe('Your API Tests', () => {
    it('should return health successfull on start', (done) => {
        chai.request(app)
            .get('/health')
            .end((err, res) => {
                expect(res).to.have.status(200);
                done();
            });
    });

    it('should return profiles based on type', (done) => {
        chai.request(app)
            .get('/profiles')
            .query({ type: 'client' })
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.be.an('array');
                profiles = res.body

                profiles.forEach((profile) => {
                    expect(profile).to.have.property('id');
                    expect(profile).to.have.property('firstName');
                    expect(profile).to.have.property('balance');
                });
                done();
            });
    });

    it('should return a specific profile of type "contractor"', (done) => {
        chai.request(app)
            .get('/profile/1?type=contractor')
            .set('profile_id', '1') 
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.be.an('object');
                expect(res.body).to.have.property('id').equal(1);
                expect(res.body).to.have.property('type').equal('client');

                done();
            });
    });

    it('should return unpaid jobs for a specific contractor', (done) => {
        chai.request(app)
            .get('/jobs/unpaid')
            .query({ contractor_id: 6 })
            .set('profile_id', '1')
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.be.an('array');
                res.body.forEach((job) => {
                    expect(job).to.have.property('id');
                    expect(job).to.have.property('description');
                    expect(job).to.have.property('price');
                });

                done();
            });
    });

    it('should make a payment for a specific job', (done) => {
        chai.request(app)
            .post('/jobs/2/pay')
            .set('profile_id', '1')
            .send({ amount: 1 })
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.deep.equal({ message: 'Payment successful' });
                done();
            });
    });

    it('should deposit money into the balance of a user', (done) => {
        chai.request(app)
            .post('/balances/deposit/1')
            .set('profile_id', '1')
            .send({ amount: 1 })
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body.message).to.include('Deposit successful');
                done();
            });
    });

    it('should return an array of best-profession', (done) => {
        // (current time)
        const startTime = new Date().toISOString();

        // (3 days ago)
        const endTime = new Date();
        endTime.setDate(endTime.getDate() - 3);
        const endTimeString = endTime.toISOString();

        chai.request(app)
            .get('/admin/best-profession')
            .query({ start: startTime, end: endTimeString, limit: 2 })
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.be.an('object');
                expect(res.body.bestProfession).to.be.a('string');
                done();
            });
    });


    it('should return an array of best-client', (done) => {
        // (current time)
        const startTime = new Date().toISOString();

        // (3 days ago)
        const endTime = new Date();
        endTime.setDate(endTime.getDate() - 3);
        const endTimeString = endTime.toISOString();

        chai.request(app)
            .get('/admin/best-clients')
            .query({ start: startTime, end: endTimeString, limit: 2 })
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.be.an('array');
                res.body.forEach(client => {
                    expect(client).to.have.property('id');
                    expect(client).to.have.property('fullName');
                    expect(client).to.have.property('paid').that.is.a('number');
                });

                done();
            });
    });
});
