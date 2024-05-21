const express = require('express');
const inquirer = require('inquirer');
const  {Pool} = require('pg');


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

const questions = 
        [
    {
        type: 'list',
        message: 'What would you like to do?',
        name: 'action',
        choices: ['view all departments', 'view all roles', 'view all employees', 'add a department', 'add a role', 'add an employee', 'update an employee role'],
    },
];

pool.connect();
function init() {
    inquirer.prompt(questions).then((userAnswers) => {
        switch (userAnswers.action){
            case 'view all departments':
               pool.query('SELECT * FROM department ORDER By name', (err, {rows}) => {
                    console.table(rows);
                });
                 init();
                break;
            case 'view all roles':
                pool.query('SELECT role.id, role.title, role.salary, department.name AS department FROM department JOIN role ON role.department = department.id',  (err, {rows}) => {
                    console.table(rows);
                });
                init();
                break;
            case 'view all employees':
                pool.query('SELECT employee.id, employee.first_name, employee.last_name, role.title, department.name AS department, role.salary, manager_id FROM employee JOIN role ON employee.role_id = role.id JOIN department ON role.department = department.id',  (err, {rows}) => {
                    console.table(rows);
                });
                init();
                break;
            case 'add a department':
                inquirer.prompt([
                    {
                        type: 'input',
                        message: 'What is the name of the department',
                        name: 'newDepartment',
                    }
                ]).then((data) => {
                function addDepartment() {
                pool.query('INSERT INTO department (name) VALUES $1', [newDepartment],  (err, {rows}) => {
                    console.table(`Added ${newDepartment} to the databse`);
                });
                }
                })
        
                init();
                break;
            default:
                break;
        };
    });
}


app.listen(PORT, () => {
    console.log("Hey you did it!");
});

init();