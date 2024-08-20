const express = require('express');
const inquirer = require('inquirer');
const { Pool } = require('pg');


const app = express();
const PORT = process.env.PORT || 3001;

const pool = new Pool(
    {
        user: 'postgres',
        password: 'p@ssw0rd',
        network: 'localhost',
        database: 'employees_db',
    },
    console.log('Connected to the employees_db database')
);

//question that are brought up at start of application to see what task you want to do. 
const questions =
    [
        {
            type: 'list',
            message: 'What would you like to do?',
            name: 'action',
            choices: ['view all departments', 'view all roles', 'view all employees', 'add a department', 'add a role', 'add an employee', 'update an employee role'],
        },
    ];

//question needed to add a department to databse 

const addDepart = [
    {
        type: 'input',
        message: 'What is the name of the department',
        name: 'newDepartment',
    },
];

//question needed to add a role to databse 
const addRole = [
    {
        type: 'input',
        message: 'What is the name of the role?',
        name: 'newRole',
    },
    {
        type: 'input',
        message: 'What is the salary of the role?',
        name: 'newSalary',
    },
    {
        type: 'list',
        message: 'Which department does the role belong to?',
        name: 'roleDepartment',
        choices: async function () {
            const { rows } = await pool.query('SELECT name FROM department ORDER By name');
            return rows.map((row) => row.name);
        },
    }
];

//question needed to add a new employee
const addEmployee = [
    {
        type: 'input',
        message: "What is the employee's first name?",
        name: 'firstName',
    },
    {
        type: 'input',
        message: "What is the employee's last name?",
        name: 'lastName',
    },
    {
        type: 'list',
        message: "What is the employee's role?",
        name: "employeesRole",
        choices: async function () {
            const { rows } = await pool.query('SELECT title FROM role ORDER By title');
            return rows.map((row) => row.title);
        },
    },
    {
        type: 'confirm',
        name: 'manager',
        message: 'Does this employee have a manager'
    },
    {
        type: 'list',
        message: 'Who is their manager?',
        name: 'employeeManager',
        when: function (answers) {
            if (answers.manager) {
                return true;
            }
            else {
                return false;
            }
        },
        choices: async function () {
            const { rows } = await pool.query('SELECT first_name FROM employee');
            let managerFirstName = rows.map((row) => row.first_name);
            return managerFirstName;
        }

    },
];

//question need to update employee
const updateEmployee = [
    {
        type: 'list',
        message: "Which employee's role do you want to update?",
        name: 'updatePerson',
        choices: async function () {
            const { rows } = await pool.query('SELECT first_name FROM employee');
            return rows.map((row) => row.first_name);
        }
    },
    {
        type: 'list',
        message: 'Which role do you want to assign the selected employee?',
        name: 'newRole',
        choices: async function () {
            const { rows } = await pool.query('SELECT title FROM role ORDER By title');
            return rows.map((row) => row.title);
        },
    }
];

// switch statemnet to handle the answers to the initial question 
pool.connect();
function init() {
    inquirer.prompt(questions).then((userAnswers) => {
        switch (userAnswers.action) {
            case 'view all departments':
                pool.query('SELECT * FROM department ORDER By name', (err, { rows }) => {
                    console.log('\n')
                    console.table(rows);
                });
                init();
                break;
            case 'view all roles':
                pool.query('SELECT role.id, role.title, role.salary, department.name AS department FROM department JOIN role ON role.department = department.id', (err, { rows }) => {
                    console.log('\n')
                    console.table(rows);
                });
                init();
                break;
            case 'view all employees':
                pool.query('SELECT employee.id, employee.first_name, employee.last_name, role.title, department.name AS department, role.salary, manager_id FROM employee JOIN role ON employee.role_id = role.id JOIN department ON role.department = department.id', (err, { rows }) => {
                    console.log('\n')
                    console.table(rows);
                });
                init();
                break;
            case 'add a department':
                addDepartment();
                break;
            case 'add a role':
                inquirer.prompt(addRole).then((answers) => {
                    getDepartmentId(answers);
                })
                break;
            case 'add an employee':
                inquirer.prompt(addEmployee).then((answers) => {
                    getRoleId(answers);
                });
                break;
            case 'update an employee role':
                inquirer.prompt(updateEmployee).then((answers) => {
                    updateEmployees(answers);
                });
                break;
            default:
                break;
        };
    });
}

//handles adding a department to the department table 
function addDepartment() {
    inquirer.prompt(addDepart).then((answer) => {
        pool.query(`INSERT INTO department (name) VALUES ($1)`, [answer.newDepartment], async (err, { rows }) => {
            console.log(`Added ${answer.newDepartment} to the databse`);
            await init()
        });
    })
};

//function that gets the id numbers from the table and uses user input to insert the data into the role table 
function getDepartmentId(answers) {
    //Gets the id number from the department the user seleceted
    pool.query('SELECT id FROM department WHERE name = $1', [answers.roleDepartment], (err, { rows }) => {
        const [ids] = rows;
        const { id } = ids;
        //takes the data the user gave and inserts it into the role table 
        pool.query(`INSERT INTO role (title, salary, department) VALUES ($1,$2,$3)`, [answers.newRole, answers.newSalary, id], async (err, data) => {
            console.log(`Added ${answers.newRole} to the database`);
            init();
        })
    })
};

function getRoleId(answers) {
    //Gets the id number from the role the user seleceted
    pool.query('SELECT id FROM role WHERE title = $1', [answers.employeesRole], (err, { rows }) => {
        const [ids] = rows;
        const { id } = ids;
        addEmployees(answers, id)
    });
};

// gets the id from employee and then uses it to add employee to the database, also handles if they have a manager or not 
function addEmployees(answers, roleId) {
    if (answers.manager) {
        pool.query('SELECT id  FROM employee WHERE first_name = $1', [answers.employeeManager], (err, { rows }) => {
            const [ids] = rows;
            const { id } = ids;

            pool.query(`INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES ($1,$2,$3,$4)`, [answers.firstName, answers.lastName, roleId, id], async (err, { rows }) => {
                console.log(`Added ${answers.firstName} to the database`);
                init();
            })
        })
    } else {
        pool.query(`INSERT INTO employee (first_name, last_name, role_id) VALUES ($1,$2,$3)`, [answers.firstName, answers.lastName, roleId], async (err, { rows }) => {
            console.log(`Added ${answers.firstName} to the database`);
            init();
        })
    }
};

//fucntion to update employee 
function updateEmployees(answers) {
    //Gets the id number from the role the user seleceted
    pool.query('SELECT id FROM role WHERE title = $1', [answers.newRole], (err, { rows }) => {
        const [ids] = rows;
        const { id } = ids;
        pool.query(`UPDATE employee SET role_id = ($1) WHERE first_name = ($2)`, [ id ,answers.updatePerson], async (err, { rows }) => {
            console.log(`Changed ${answers.updatePerson} role to ${answers.newRole}`);
            init()
        });
    });
};


app.listen(PORT, () => {
    console.log("Server is running!");
});

init();