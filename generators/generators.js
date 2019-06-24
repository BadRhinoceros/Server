let funcVariblesList = []
let funcComponents = []
let expressions = ['+', '-', '/', '*']

function getRandomInt(min, max) { // функция для получения рандомного числа по заданному диапазону
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports.generateWord = function() { // Генератор слов
	let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
	let wordLength = getRandomInt(5, 10)
	let word = ''

	for (let i = 0; i <= wordLength; i++) {
		let charIndex = getRandomInt(0, chars.length - 1)
		word += chars[charIndex]
	}

	return word
}

module.exports.generateFunction = function() {
	funcVariblesList = []
	let variablesList = ['a', 'b', 'c', 'x', 'y', 'p1', 'p2']
	let variablesCount = getRandomInt(1, variablesList.length - 1)

	for (let i = 0; i <= variablesCount; i++) {
		let variableIndex = getRandomInt(0, variablesList.length - 1)
		funcVariblesList.push(variablesList[variableIndex])
		variablesList.splice(variableIndex, 1)
	}

	return getComponents(funcVariblesList)
}

function getComponents(variablesList) {
	funcComponents = []
	let components = ['Math.sin(*)', 'Math.cos(*)', 'Math.tan(*)', '(1/Math.tan(*))', '(*)']
	let componentsCount = components.length - 1

	variablesList.forEach(item => {
		let componentIndex = getRandomInt(0, componentsCount)
		funcComponents.push(components[componentIndex].replace('*', item))
	})
	
	return getFunction(funcComponents)
}

function getFunction() {
	// формирование блока переменных
	let variablesBlock = `(${funcVariblesList.join(',')}) => `
	// формирование тела функции
	let seriesCount = getRandomInt(1, 3)
	let seriesList = []
	
	for (let seriesIndex = 0; seriesIndex <= seriesCount; seriesIndex++) { // будет 2 ряда
		let seriesBlock = ''
		let funcComponentsCount = funcComponents.length - 1
		
		for (let j = 0; j <= funcComponentsCount; j++) {
			let componentIndex = getRandomInt(0, funcComponentsCount)
			let expressionIndex = getRandomInt(0, expressions.length - 1)
			
			if (j != funcComponentsCount) {
				seriesBlock += `(${funcComponents[componentIndex]})` + expressions[expressionIndex]
			} else {
				seriesBlock += `(${funcComponents[componentIndex]})`
			}
		}

		seriesList.push(`(${seriesBlock})`)
	}

	let funcBlock = '{return('
	
	for (let i = 0; i<= seriesList.length - 1; i++) {
		let expressionIndex = getRandomInt(0, expressions.length - 1)
		
		if (i != seriesList.length - 1) {
			funcBlock += seriesList[i] + expressions[expressionIndex]
		} else {
			funcBlock += seriesList[i]
		}
	}

	funcBlock += ')}'
	// строчный результат
	return func = variablesBlock + funcBlock
}

function getRandomInt(min, max) { // функция для получения рандомного числа по заданному диапазону
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
