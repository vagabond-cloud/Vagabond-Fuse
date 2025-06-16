/**
 * Console formatter utility for beautiful CLI output
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';

export class ConsoleFormatter {
  private static instance: ConsoleFormatter;
  private spinner: any;

  constructor() {
    this.spinner = ora();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ConsoleFormatter {
    if (!ConsoleFormatter.instance) {
      ConsoleFormatter.instance = new ConsoleFormatter();
    }
    return ConsoleFormatter.instance;
  }

  /**
   * Print a section header
   * @param title Section title
   */
  printHeader(title: string): void {
    console.log('\n' + chalk.bold.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.bold.white(`  ${title}`));
    console.log(chalk.bold.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━') + '\n');
  }

  /**
   * Print a subsection header
   * @param title Subsection title
   */
  printSubHeader(title: string): void {
    console.log('\n' + chalk.cyan(`▶ ${title}`));
    console.log(chalk.gray('───────────────────────────────────────────────────────────────────'));
  }

  /**
   * Print a success message
   * @param message Success message
   */
  success(message: string): void {
    this.spinner.succeed(chalk.green(message));
  }

  /**
   * Print an error message
   * @param message Error message
   */
  error(message: string): void {
    this.spinner.fail(chalk.red(message));
  }

  /**
   * Print an info message
   * @param message Info message
   */
  info(message: string): void {
    console.log(chalk.blue(`ℹ ${message}`));
  }

  /**
   * Print a warning message
   * @param message Warning message
   */
  warn(message: string): void {
    console.log(chalk.yellow(`⚠ ${message}`));
  }

  /**
   * Start a spinner with the given text
   * @param text Spinner text
   */
  startSpinner(text: string): void {
    this.spinner.start(chalk.blue(text));
  }

  /**
   * Stop the spinner with a success message
   * @param text Success message
   */
  stopSpinnerSuccess(text: string): void {
    this.spinner.succeed(chalk.green(text));
  }

  /**
   * Stop the spinner with an error message
   * @param text Error message
   */
  stopSpinnerError(text: string): void {
    this.spinner.fail(chalk.red(text));
  }

  /**
   * Print a table with the given data
   * @param headers Table headers
   * @param data Table data
   */
  printTable(headers: string[], data: any[][]): void {
    const table = new Table({
      head: headers.map(header => chalk.bold.white(header)),
      chars: {
        'top': '━', 'top-mid': '┳', 'top-left': '┏', 'top-right': '┓',
        'bottom': '━', 'bottom-mid': '┻', 'bottom-left': '┗', 'bottom-right': '┛',
        'left': '┃', 'left-mid': '┣', 'mid': '━', 'mid-mid': '╋',
        'right': '┃', 'right-mid': '┫', 'middle': '┃'
      },
      style: {
        head: [], // No additional styling needed as we've already styled the headers
        border: [] // No additional styling needed for borders
      }
    });

    // Add rows to the table
    data.forEach(row => {
      table.push(row);
    });

    console.log(table.toString());
  }

  /**
   * Print a credential card
   * @param title Card title
   * @param data Card data as key-value pairs
   */
  printCredentialCard(title: string, data: Record<string, string>): void {
    console.log('\n' + chalk.bold.white(`┌─────────────── ${title} ───────────────┐`));
    
    Object.entries(data).forEach(([key, value]) => {
      console.log(chalk.white(`│ ${chalk.cyan(key.padEnd(20))}: ${value.length > 40 ? value.substring(0, 37) + '...' : value.padEnd(40)} │`));
    });
    
    console.log(chalk.bold.white(`└──────────────────────────────────────────────────┘`) + '\n');
  }

  /**
   * Print a wallet card
   * @param name Wallet owner name
   * @param address Wallet address
   * @param balance Wallet balance
   * @param did DID
   */
  printWalletCard(name: string, address: string, balance: number, did: string): void {
    const balanceInXRP = balance / 1000000;
    
    console.log('\n' + chalk.bold.white(`┌─────────────── ${name}'s Wallet ───────────────┐`));
    console.log(chalk.white(`│ ${chalk.cyan('Address'.padEnd(12))}: ${address.padEnd(40)} │`));
    console.log(chalk.white(`│ ${chalk.cyan('Balance'.padEnd(12))}: ${balanceInXRP.toString()} XRP${' '.repeat(40 - balanceInXRP.toString().length - 4)} │`));
    console.log(chalk.white(`│ ${chalk.cyan('DID'.padEnd(12))}: ${did.padEnd(40)} │`));
    console.log(chalk.bold.white(`└──────────────────────────────────────────────────┘`) + '\n');
  }

  /**
   * Print a transaction receipt
   * @param txType Transaction type
   * @param txHash Transaction hash
   * @param from From address
   * @param to To address
   * @param amount Amount
   * @param fee Fee
   * @param network Network
   */
  printTransactionReceipt(
    txType: string,
    txHash: string,
    from: string,
    to: string,
    amount: string,
    fee: string,
    network: string
  ): void {
    console.log('\n' + chalk.bold.white(`┌─────────────── Transaction Receipt ───────────────┐`));
    console.log(chalk.white(`│ ${chalk.cyan('Type'.padEnd(12))}: ${txType.padEnd(43)} │`));
    console.log(chalk.white(`│ ${chalk.cyan('Hash'.padEnd(12))}: ${txHash.length > 43 ? txHash.substring(0, 40) + '...' : txHash.padEnd(43)} │`));
    console.log(chalk.white(`│ ${chalk.cyan('From'.padEnd(12))}: ${from.length > 43 ? from.substring(0, 40) + '...' : from.padEnd(43)} │`));
    console.log(chalk.white(`│ ${chalk.cyan('To'.padEnd(12))}: ${to.length > 43 ? to.substring(0, 40) + '...' : to.padEnd(43)} │`));
    console.log(chalk.white(`│ ${chalk.cyan('Amount'.padEnd(12))}: ${amount.padEnd(43)} │`));
    console.log(chalk.white(`│ ${chalk.cyan('Fee'.padEnd(12))}: ${fee.padEnd(43)} │`));
    console.log(chalk.white(`│ ${chalk.cyan('Explorer'.padEnd(12))}: ${`https://${network === 'mainnet' ? '' : network + '.'}xrpl.org/transactions/${txHash}`.padEnd(43)} │`));
    console.log(chalk.bold.white(`└─────────────────────────────────────────────────────┘`) + '\n');
  }
} 