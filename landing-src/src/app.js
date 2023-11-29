const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { sequelize } = require('./model')
const { getProfile } = require('./middleware/getProfile')
const app = express();
app.use(bodyParser.json());
app.use(cors({ optionsSuccessStatus: 200 }));
const path = require('path');

const { Op, Sequelize } = require('sequelize');

app.set('sequelize', sequelize)
app.set('models', sequelize.models)

app.get('/health', async (_, res) => res.send("ok"))

app.get('/profiles', async (req, res) => {
    const { Profile } = req.app.get('models')
    const profiles = await Profile.findAll({ where: { type: req.query.type } })
    if (!profiles) return res.status(404).end()
    res.json(profiles)
})

app.get('/profile/:profileId', getProfile, async (req, res) => {
    const { Profile } = req.app.get('models')
    const profiles = await Profile.findOne({ where: { id: req.params.profileId } })
    if (!profiles) return res.status(404).end()
    res.json(profiles)
})

app.get('/jobs/unpaid', getProfile, async (req, res) => {
    const { Job, Contract } = req.app.get('models');
    try {
        const contracts = await Contract.findAll({
            raw: true,
            where: {
                [Op.and]: [
                    { ContractorId: req.query.contractor_id },
                    { ClientId: req.headers.profile_id },
                ],
                status: 'in_progress',
            },
        });

        const jobs = await Job.findAll({
            raw: true,
            where: {
                contractId: contracts.map((c) => c.id),
                // paid: null,
            },
        });

        res.json(jobs);
    } catch (error) {
        console.error(error);
        res.status(500).end();
    }
});


app.post('/balances/deposit/:userId', getProfile, async (req, res) => {
    const { Profile, Job, Contract } = req.app.get('models');
    const t = await sequelize.transaction();

    try {
        const clientProfile = await Profile.findOne({
            raw: true,
            where: {
                id: req.params.userId
            },
            transaction: t,
        });

        const clientContracts = await Contract.findAll({
            raw: true,
            where: {
                ClientId: req.params.userId
            },
            transaction: t,
        });

        const jobsToPay = await Job.findAll({
            raw: true,
            where: {
                ContractId: clientContracts.map(c => c.id),
                paid: null
            },
            transaction: t,
        });

        const totalAmountToDeposit = jobsToPay.reduce((total, job) => total + job.price, 0) * 0.25;

        if (req.body.amount > totalAmountToDeposit) {
            await t.rollback();
            return res.status(400).json({ error: `Deposit amount exceeds the limit of ${totalAmountToDeposit} (25% of total of jobs to pay)` });
        }

        const balance = clientProfile.balance + req.body.amount
        await Profile.update(
            { balance },
            {
                where: {
                    id: clientProfile.id,
                },
                transaction: t,
            }
        );

        await t.commit();
        res.json({ message: 'Deposit successful', balance: balance });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: 'Internal Server Error', error });
    }
});



app.post('/jobs/:job_id/pay', getProfile, async (req, res) => {
    const { Job, Profile, Contract } = req.app.get('models');

    const t = await sequelize.transaction();

    try {
        const job = await Job.findOne({
            raw: true,
            where: {
                id: req.params.job_id
            },
            transaction: t,
        });

        if (!job) {
            await t.rollback();
            return res.status(404).json({ error: 'Job not found' });
        }

        const contract = await Contract.findOne({
            raw: true,
            where: {
                id: job.ContractId
            },
            transaction: t,
        });

        if (!contract) {
            await t.rollback();
            return res.status(404).json({ error: 'Contract not found' });
        }

        const contractorProfile = await Profile.findOne({
            raw: true,
            where: {
                id: contract.ContractorId
            },
            transaction: t,
        });

        const clientProfile = await Profile.findOne({
            raw: true,
            where: {
                id: contract.ClientId
            },
            transaction: t,
        });


        if (clientProfile.balance < req.body.amount) {
            await t.rollback();
            return res.status(400).json({ error: 'Insufficient funds' });
        }

        await Profile.update(
            { balance: contractorProfile.balance + req.body.amount },
            {
                where: {
                    id: contractorProfile.id,
                },
                transaction: t,
            }
        );

        await Profile.update(
            { balance: clientProfile.balance - req.body.amount },
            {
                where: {
                    id: clientProfile.id,
                },
                transaction: t,
            }
        );

        await t.commit();
        res.json({ message: 'Payment successful' });
    } catch (error) {
        console.error(error);
        await t.rollback();
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.get('/admin/best-profession', async (req, res) => {
    const { start, end } = req.query;
    const { Profile, Contract, Job } = req.app.get('models');

    try {
        const profiles = await Profile.findAll();

        const contractors = await Promise.all(profiles.map(async (profile) => {
            const contracts = await Contract.findAll({
                where: {
                    ClientId: profile.id,
                },
                include: [{
                    model: Job,
                    where: {
                        paid: true,
                        createdAt: {
                            [Op.between]: [start, end]
                        }
                    },
                    as: 'Jobs',
                }],
            });
            return { profile, contracts };
        }));

        const professionEarnings = {};
        contractors.forEach(contractor => {
            const { profile, contracts } = contractor;
            const profession = profile.profession;
            const earnings = contracts.reduce((total, contract) => {
                return total + contract.jobs.reduce((jobTotal, job) => jobTotal + job.price, 0);
            }, 0);

            if (!professionEarnings[profession]) {
                professionEarnings[profession] = 0;
            }

            professionEarnings[profession] += earnings;
        });

        const bestProfession = Object.keys(professionEarnings).reduce((best, profession) => {
            return professionEarnings[profession] > professionEarnings[best] ? profession : best;
        });

        res.json({ bestProfession });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/admin/best-clients', async (req, res) => {
    const { start, end, limit = 2 } = req.query;
    const { Profile, Contract, Job } = req.app.get('models');

    try {
        const clients = await Profile.findAll();

        const clientEarnings = {};
        await Promise.all(clients.map(async (client) => {
            const contracts = await Contract.findAll({
                where: {
                    ClientId: client.id,
                },
                include: [{
                    model: Job,
                    where: {
                        paid: 1,
                        // Seems to break
                        // updatedAt: {
                        //     [Op.between]: [new Date(start), new Date(end)]
                        // }
                    },
                }],
            });

            const earnings = contracts.reduce((total, contract) => {
                return total + contract.Jobs.reduce((jobTotal, job) => jobTotal + job.price, 0);
            }, 0);

            clientEarnings[client.id] = earnings;
        }));

        const bestClients = Object.keys(clientEarnings)
            .sort((a, b) => clientEarnings[b] - clientEarnings[a])
            .slice(0, limit);

        const bestClientsData = clients
            .filter(client => bestClients.includes(client.id.toString()))
            .map(client => ({
                id: client.id,
                fullName: `${client.firstName} ${client.lastName}`,
                paid: clientEarnings[client.id],
            }));

        res.json(bestClientsData.reverse());
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});




module.exports = app;
