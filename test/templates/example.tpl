>>> Welcome to the CLI template engine!

>>> This template engine supports embedded JavaScript with whitespace control.

>>> Lines that begin with `>` are print statements. The number of `>` characters determines the \
trailing line returns.

>>> With a single `>` character, you can combine multiple statements on a single line:
> a
> b
> c
>>>

>>> Using two `>>` characters will add a newline character between each print statement:
>> a
>> b
>> c
>>

>>> If a line gets long, you can end the line with a `\` and continue your print statement on the \
next line.

>>> Flags directly precede the `>` print statement declaration. Here are the supports flags:

>>>|  `?` If the resulting message to be printed is empty, this flag will suppress the trailing \
  newline characters.
>>>|  `|` Prevents the output from being trimmed prior to being printed. By default, all messages \
  are trimmed.

>>> Any lines that do not contain a `>` print statement are considered plain old JavaScript. You \
can use `for` loops, `if` statements, define variables, call functions, etc.

>>> Each print statement is evaluated as an ES6 template string allowing you to print variables.

const name = 'awesome';
>>> This template engine is ${name}!

>>> Print statements can go inside any JavaScript block as long as it's on its own line.

const reasons = [
	'State of the art command line parser',
	'Template engine designed for command line programs',
	'Wraps external CLI\'s as extensions',
	'Hook into the parsing engine'
];

>> Here's a few reasons you should use cli-kit:
for (const reason of reasons) {
	>>| * ${reason}
}
>>| * and more!
